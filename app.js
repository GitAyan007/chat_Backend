import { v2 as cloudinary } from "cloudinary";
import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from 'dotenv';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { v4 as uuid } from "uuid";
import { corsOption } from './constants/config.js';
import { CHAT_JOINED, CHAT_LEFT, NEW_MESSAGE, NEW_MESSAGE_ALERT, ONLINE_USERS, START_TYPING, STOP_TYPING } from './constants/events.js';
import { getSockets } from './lib/helper.js';
import { socketAuthenticator } from './middlewares/auth.js';
import { errHandler } from './middlewares/errorHandler.js';
import { Message } from './model/message.js';
import adminRoutes from "./routes/admin.js";
import chatRoutes from "./routes/chat.js";
import userRoute from "./routes/user.js";
import { connectDB } from './utils/features.js';


// configuring dot env
dotenv.config({
    path: "./.env",
});

// fetching from env
const uri = process.env.MONGO_URI;
const port = process.env.PORT || 3000;
export const envMode = process.env.NODE_ENV.trim() || "PRODUCTION";
// active users---->
export const userSocketIds = new Map();
// online users ---->
export const onlineUSers = new Set();

// connecting to database
connectDB(uri);
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
})

// fake users
//  createUser(10); //called it 1 time to create 10 users otherwise it will create everytime

// creating a express instance/ object to to configure routes, middleware and other things
const app = express();
const server = createServer(app);
const io = new Server(server, {
    cors: corsOption
});

// saving the instance of io--> this will help me to use io outside of app
// example: const io = req.app.get("io"); 
app.set("io", io);


// using middleware here
// ---> to acess json data
app.use(express.json());
// ---> to access form data
// app.use(express.urlencoded()); // but this can accept only single type of form data

// to parse cookies
app.use(cookieParser());
app.use(cors(corsOption));




// routing 
app.use('/api/v1/user', userRoute);
app.use('/api/v1/chat', chatRoutes);
app.use('/api/v1/admin', adminRoutes);

// just testing 
app.get('/', (req, res) => {
    res.send("testing");
})



// socket middleware
io.use((socket, next) => {
    cookieParser()(socket.request, socket.request.res, async (err) =>
        await socketAuthenticator(err, socket, next)
    );
});



io.on("connection", (socket) => {


    const user = socket.user;

    // console.log("User->", user);

    // mapping user id with socket id
    userSocketIds.set(user._id.toString(), socket.id);
    // console.log(userSocketIds);

    socket.on(NEW_MESSAGE, async ({ chatId, members, message }) => {

        const messageForRealTime = {
            content: message,
            _id: uuid(),
            sender: {
                _id: user._id,
                name: user.name
            },
            chat: chatId,
            createdAt: new Date().toISOString(),
        }

        const messageForDB = {
            content: message,
            sender: user._id,
            chat: chatId
        }

        console.log("emitting", messageForRealTime);

        const membersSocket = getSockets(members); //jisko hum msg bhejenge 
        io.to(membersSocket).emit(NEW_MESSAGE, {
            chatId,
            message: messageForRealTime
        }); // sending message 

        io.to(membersSocket).emit(NEW_MESSAGE_ALERT, { chatId }); //for example: 4 new messages, like this

        try {
            await Message.create(messageForDB);
        } catch (error) {
            console.log(error);
        }
    })

    socket.on(START_TYPING, ({ members, chatId }) => {
        console.log("start - ID", chatId);

        const membersSockets = getSockets(members);
        socket.to(membersSockets).emit(START_TYPING, { chatId });
    })

    socket.on(STOP_TYPING, ({ members, chatId }) => {
        console.log("stop - ID", chatId);

        const membersSockets = getSockets(members);
        socket.to(membersSockets).emit(STOP_TYPING  , { chatId });
    })

    // online / offline
    socket.on(CHAT_JOINED, ({userId, members})=>{

        onlineUSers.add(userId.toString());

        const membersSocket = getSockets(members);
        io.to(membersSocket).emit(ONLINE_USERS, Array.from(onlineUSers));
    });

    socket.on(CHAT_LEFT, ({userId, members})=>{

        onlineUSers.delete(userId.toString());

        const membersSocket = getSockets(members);
        io.to(membersSocket).emit(ONLINE_USERS, Array.from(onlineUSers)); 
    });

    socket.on("disconnect", () => { 
        console.log("User Disconnected");
        userSocketIds.delete(user._id.toString());
        onlineUSers.delete(user._id.toString());
        socket.broadcast.emit(ONLINE_USERS, Array.from(onlineUSers));
    })
})









app.use(errHandler);

// connecting to server
server.listen(port, () => {
    console.log(`Server is running on port ${port} in ${envMode} Mode`);
})
