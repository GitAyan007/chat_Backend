import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { v2 as cloudinary } from "cloudinary"
import { v4 as uuid } from 'uuid'
import { getbase64, getSockets } from "../lib/helper.js";

const connectDB = (uri) => {
    mongoose
        .connect(uri,
            {
                dbName: "ChitChat",
                useNewUrlParser: true,
                useUnifiedTopology: true,
            }
        )
        .then(() => console.log("Database Connected Succesfully"))
        .catch((error) => {
            console.log("Facing issues while connecting to db");
            console.log(error);
            process.exit(1);
        });
};

// to do i am getting an error here receiving everything as undefined

const sendToken = async ({ res, user, code = 201, message }) => {
    // console.log(user._id);
    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET);
    // console.log("token->", token);

    // console.log("code------------->", code);
    return res.status(code).cookie("chitchat-token", token, {
        // cookie settings 
        maxAge: 15 * 24 * 60 * 60 * 1000,
        sameSite: "none",
        httpOnly: true,
        secure: true

    }).json({
        success: true,
        token,
        user,
        message,
    });
};


const emitEvent = (req, event, users, data) => {
     
    const io = req.app.get("io");
    const userSocket = getSockets(users);
    io.to(userSocket).emit(event, data);

    console.log("emmiting event", event);
};


const uploadFilesToCloudinary = async (files = []) => {
    const uploadPromises = files.map((file) => {
        return new Promise((resolve, reject) => {
            cloudinary.uploader.upload(getbase64(file), {
                resource_type: "auto",
                public_id: uuid(),
            }, (error, result) => {
                if (error) return reject(error);
                resolve(result);
            })
        })
    });

    try {
        const results = await Promise.all(uploadPromises); // concurrent wotking
        const formatedResults = results.map((result) => ({
            public_id: result.public_id,
            url: result.secure_url,
        }))

        return formatedResults;
    } catch (error) {
        throw new Error("Error in uploading files to cloudinary", error);
    }
};

const deleteFilesfromCloudinary = async (public_id) => {
    // delete files from cloudinary
}

export { connectDB, sendToken, emitEvent, deleteFilesfromCloudinary, uploadFilesToCloudinary };