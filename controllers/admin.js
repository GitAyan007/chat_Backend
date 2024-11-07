import { Chat } from "../model/chat.js";
import { User } from "../model/user.js";
import { Message } from "../model/message.js";
import { ErrorHAndler } from "../utils/utility.js";
import jwt from "jsonwebtoken";

const cookieOptions = {
    // cookie settings 
    maxAge: 15 * 24 * 60 * 60 * 1000,
    sameSite: "none",
    httpOnly: true,
    secure: true
}


const adminLogin = async(req,res,next)=>{
    
    const {secretKey} = req.body;

    const adminSecretKey = process.env.ADMIN_SECRET_KEY || "abc";
    const isMatched = secretKey === adminSecretKey;
    if(!isMatched) return next(new ErrorHAndler("Wrong Secret Key",401));

    const token = jwt.sign(secretKey,process.env.JWT_SECRET);

    return res.status(200).cookie("admin-token", token, {...cookieOptions, maxAge:1000*60*20}).json({
        success:true,
        message:"Autheticated",
    })
}

const adminLogout = async(req,res,next)=>{
    
    return res.status(200).cookie("admin-token", "", {...cookieOptions, maxAge:0}).json({
        success:true,
        message:"Logout successfully",
    })
}

const getAdmin = async(req,res)=>{
    return res.status(200).json({
        admin:true,
    })
}

const AllUsers = async (req, res) => {
    const users = await User.find();

    const transformedUser = await Promise.all(
        users.map(async ({ name, username, avatar, _id }) => {

            const [groups, friends] = await Promise.all([
                // this finds all the group chats where i am also a member 
                Chat.countDocuments({ groupChat: true, members: _id }),
                // this finds the single chats means my friends 
                Chat.countDocuments({ groupChat: false, members: _id })
            ])

            return {
                name,
                username,
                avatar: avatar.url,
                _id,
                groups,
                friends
            }
        })
    )

    return res.status(200).json({
        success: true,
        users: transformedUser
    })
}

const AllChats = async (req, res) => {
    const chats = await Chat.find({})
        .populate("members", "name avatar")
        .populate("creator", "name avatar");

    const transformedChats = await Promise.all(
        chats.map(async ({ members, _id, groupChat, name, creator }) => {
            const totalMessages = await Message.countDocuments({ chat: _id });
            return {
                _id,
                groupChat,
                name,
                avatar: members.slice(0, 3).map((member) => member.avatar.url),
                members: members.map(({ _id, name, avatar }) => ({
                    _id,
                    name,
                    avatar: avatar.url,
                })),
                creator: {
                    name: creator?.name || "none",
                    avatar: creator?.avatar.url || "",
                },
                totalMembers: members.length,
                totalMessages
            }
        })
    )

    return res.status(200).json({
        success: true,
        transformedChats
    });
}

const AllMessages = async (req, res) => {
    const messages = await Message.find({})
        .populate("sender", "name avatar")
        .populate("chat", "groupChat");

    const transformedMessage = messages.map(({ content, attachments, _id, sender, createdAt, chat }) => ({
        _id,
        attachments,
        content,
        createdAt,
        chat: chat._id,
        groupChat: chat.groupChat,
        sender: {
            _id: sender._id,
            name: sender.name,
            avatar: sender.avatar.url
        }
    }))

    return res.status(200).json({
        success: true,
        transformedMessage
    });
}

const getDashboard = async(req, res)=>{

    const[groupsCount, usersCount, messagesCount, totalChatCount] = 
    await Promise.all([
        Chat.countDocuments({groupChat: true}),
        User.countDocuments(),
        Message.countDocuments(),
        Chat.countDocuments(),
    ]);

    const today = new Date();
    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() -7);

    const last7DaysMsg = await Message.find({
        createdAt:{
            $gte : last7Days,
            $lte : today,
        }
    }).select("createdAt");

    const messages = new Array(7).fill(0);
    const dayInMiliSeconds = 1000 * 60 * 60 * 24;

    last7DaysMsg.forEach((message)=>{
        const approxIndex = (today.getTime() - message.createdAt.getTime())/dayInMiliSeconds;
        const index = Math.floor(approxIndex);

        messages[6-index]++;
    })

    const stats = {
        groupsCount,
        usersCount, messagesCount, totalChatCount,
        messagesChart: messages
    }

    return res.status(200).json({
        success:true,
        stats,
        message: "transformedMessages",
    })
}

export { AllUsers, AllChats, AllMessages, getDashboard, adminLogin, adminLogout, getAdmin};

