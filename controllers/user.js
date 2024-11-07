import { compare } from "bcrypt";
import { User } from "../model/user.js";
import { emitEvent, sendToken, uploadFilesToCloudinary } from "../utils/features.js";
import jwt from "jsonwebtoken";
import { ErrorHAndler } from "../utils/utility.js";
import { Chat } from "../model/chat.js";
import { Request } from "../model/request.js";
import { NEW_REQUEST, REFETCH_CHATS } from "../constants/events.js";
import { getOtherMember } from "../lib/helper.js";


const cookieOptions = {
    // cookie settings 
    maxAge: 15 * 24 * 60 * 60 * 1000,
    sameSite: "none",
    httpOnly: true,
    secure: true
}

// create a new user ans save it to the database and save token in cookie
const firstTimeLogin = async (req, res, next) => {
    try {
        const { name, username, password, bio } = req.body;

        const file = req.file;

        if(!file) return next(new ErrorHAndler("Please upload Avatar")); 

        const result = await uploadFilesToCloudinary([file]);
        console.count("hi");
        console.log("Result: ", result);
        console.count("hi");
        const avatar = {
            public_id: result[0].public_id,
            url: result[0].url,
        };
        // before saving user password is hashed directly in user schema

        // saving new user
        const user = await User.create({
            name,
            username,
            password,
            avatar,
            bio
        });

        // sendToken(res, user, 201, "User created successfully");


        const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET);
        console.log("token->", token);

        return res.status(201).cookie("chitchat-token", token, { cookieOptions }).json({
            success: true,
            token,
            user,
            message: "User created successfully",
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        })
    }
};




// login 
const login = async (req, res, next) => {
    try {
        const { username, password } = req.body;
        // here i am using "select" to select the password which i have disabled in the user schema 
        const isUserPresent = await User.findOne({ username }).select("+password");
        if (!isUserPresent) return next(new ErrorHAndler("Invalid Username", 404));


        // now checking if password is matching/ correct or not
        const isPasswordMatched = await compare(password, isUserPresent.password);

        if (!isPasswordMatched) return next(new ErrorHAndler("Wrong Password", 400));

        const token = jwt.sign({ _id: isUserPresent._id }, process.env.JWT_SECRET);
        return res.status(200).cookie("chitchat-token", token, { cookieOptions }).json({
            success: true,
            message: `Welcome back ${isUserPresent.name}`,
        });
    } catch (error) {
        next(error);
    }
};


// get profile information
const getMyProfile = async (req, res) => {
    return res.status(200).json({
        success: true,
        data: req.user,
        message: "Successfully fetched your profile data"
    });

}


// logout 
const logout = async (req, res) => {
    // setting cookie empty
    return res.status(200).cookie('chitchat-token', "", { ...cookieOptions, maxAge: 0 }).json({
        success: true,
        message: "Successfully logged out"
    });

}


// search user
// tips --------> for query search give a "?" which means query and adding "&" makes u add more queries
const searchhUser = async (req, res) => {

    // the name of the user i want to find
    const { name="" } = req.query;


    const getMychats = await Chat.find({ groupChat: false, members: req.user });
    // all users from my chats means friends or people i have chatted with
    const allUsersFromMyChats = getMychats.flatMap((chat) => chat.members);



    // search
    const allUsersExceptMeandFriends = await User.find({
        // this means except me and my frinds it will find other peoples
        _id: { $nin: allUsersFromMyChats },

        // and to find the user based on their names like --> "ay" is inside "ayan"
        // it will find the pattern and for case senisitive options: "i"
        name: { $regex: name, $options: "i" },
    });

    // modify
    const users = allUsersExceptMeandFriends.map(({ _id, name, username, avatar }) => ({
        _id, name, username, avatar: avatar.url
    }));



    return res.status(200).json({
        success: true,
        users,
        // allUsersFromMyChats, // checking only
        message: name
    });

}


const sendFriendRequest = async (req, res, next) => {
    const { userId } = req.body;

    // first i need to check whether i have already sent the request to the person or the person  has already sent me a requst
    const request = await Request.findOne({
        $or: [
            { sender: req.user, receiver: userId },
            { sender: userId, receiver: req.user }
        ],

    });

    if (request) return next(new ErrorHAndler("Request already sent!", 400));

    // else create a new request
    await Request.create({
        sender: req.user,
        receiver: userId
    });

    // notification for the receiver
    emitEvent(req, NEW_REQUEST, [userId], "request");


    return res.status(200).json({
        success: true,
        message: "Request Sent Succesfully"
    });
}


const acceptFrienRequest = async (req, res, next) => {
    const { requestId, accept } = req.body;

    const request = await Request.findById(requestId)
        .populate("sender", "name")
        .populate("receiver", "name");

    // console.log("request -->", request.receiver);
    // console.log("user-->", req.user);

    if (!request) return next(new ErrorHAndler("Request not found", 400));

    // and also i need to check my id and receiver id shoukd be same ,bcz i am accepting the request
    if (request.receiver._id.toString() != req.user._id.toString()) return next(new ErrorHAndler("You are not authorized to accept this request", 400));

    // reject request ----------->
    if (!accept) {
        await request.deleteOne();

        return res.status(200).json({
            success: true,
            message: "Request Rejected"
        })
    }

    // accept so create a new chat between them ------->
    const members = [request.receiver._id, request.sender._id];

    await Promise.all([
        Chat.create({
            members,
            name: `${request.sender.name} - ${request.receiver.name}`
        }),
        request.deleteOne()
    ])


    emitEvent(req, REFETCH_CHATS, members);

    return res.status(200).json({
        success: true,
        message: "Request accepted succesfully",
        senderId: request.sender._id
    })
}


const getMyNotifications = async (req, res, next) => {
    const requests = await Request.find({ receiver: req.user }).populate("sender",
        "name avatar"
    )

    const transformedRequests = requests.map(({ _id, sender }) => ({
        _id,
        sender: {
            _id: sender._id,
            name: sender.name,
            avatar: sender.avatar.url,
        }
    }))

    return res.status(200).json({
        success: true,
        requests: transformedRequests,
    })
}




const getMyFriends = async(req, res ,next)=>{
    const chatId = req.query.chatId;

    const chats = await Chat.find({
        members: req.user._id,
        groupChat:false,
    });

    // all my friends
    const friendsPromise =  chats.map(async({members})=>{
        const otherUserID = getOtherMember(members, req.user._id);
        const otherUSer = await User.findById(otherUserID);
        // console.log("----->",otherUSer.avatar.url);
        return {
            _id: otherUSer._id,
            name: otherUSer.name,
            avatar: otherUSer.avatar.url
        };
    })

    const friends  = await Promise.all(friendsPromise); 
    if(chatId){
        const chat = await Chat.findById(chatId);

        // available friends
        const availableFriends = friends.filter((friend) => !chat.members.includes(friend._id));

        return res.status(200).json({
            success:true,
            message:"The available friends on this chatID",
            friends: availableFriends,
        })
    }else{
        return res.status(200).json({
            success:true,
            message: "All friends",
            friends
        })
    }

     
}



export {
    login,
    firstTimeLogin,
    getMyProfile,
    logout,
    searchhUser,
    sendFriendRequest,
    acceptFrienRequest,
    getMyNotifications,
    getMyFriends
};
