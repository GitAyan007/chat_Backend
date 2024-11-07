import { ALERT, NEW_MESSAGE, NEW_MESSAGE_ALERT, REFETCH_CHATS } from "../constants/events.js";
import { getOtherMember } from "../lib/helper.js";
import { Chat } from "../model/chat.js";
import { Message } from "../model/message.js";
import { User } from "../model/user.js";
import { deleteFilesfromCloudinary, emitEvent, uploadFilesToCloudinary } from "../utils/features.js";
import { ErrorHAndler } from "../utils/utility.js";

const newGroupChat = async (req, res, next) => {
    try {
        const { name, members } = req.body;

        if (members.length < 2) return next(new ErrorHAndler(
            "Group chat must have at least 2 members", 400
        ));

        // creating a group chat with friends id and my own id
        const allMembers = [...members, req.user];

        await Chat.create({
            name,
            groupChat: true,
            creator: req.user,
            members: allMembers
        });

        emitEvent(req, ALERT, allMembers, `Welcome to ${name} chat`)
        emitEvent(req, REFETCH_CHATS, members);

        return res.status(201).json({
            success: true,
            message: `${name} chat was created successfully`
        })

    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message
        })

    }
}


const getmyChat = async (req, res, next) => {
    try {
        // accessing the name of the user         fetching name excluding id(as id comes by default)
        const name = await User.findById(req.user).select('name -_id');

        // console.log("User->", req.user);
        const chats = await Chat.find({ members: req.user._id }).populate(
            "members",
            "name avatar"
        );


        const transformedChats = chats.map(({ _id, name, members, groupChat }) => {

            // if not a group chat show the chat and avatar of other member
            const otherMember = getOtherMember(members, req.user._id);

            return {
                _id,
                groupChat,
                // i am adding a avatar here, and the it consist of 3 members pictures only 
                // if group consist more than 2 members then show 3 avatar or else show the othermember avtar accept mine
                avatar: groupChat ? members.slice(0, 3).map(({ avatar }) => avatar.url) : [otherMember.avatar.url],
                name: groupChat ? name : otherMember.name,

                // i only want the mmebers id accept my own id
                members: members.reduce((prev, curr) => {
                    if (curr._id.toString() !== req.user._id.toString()) {
                        prev.push(curr._id);
                    }
                    return prev;
                }, []),
            }
        })

        return res.status(200).json({
            success: true,
            chats: transformedChats,
            req: req.user,
            message: `${name}, Found Your Chats Successfully`
        })

    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message
        })

    }
}

const getMyGroups = async (req, res, next) => {
    try {

        const chats = await Chat.find({
            members: req.user,
            groupChat: true,
            creator: req.user,
        }).populate("members", "name avatar");

        // transforming
        const groups = chats.map(({ members, _id, groupChat, name }) =>
        ({
            _id,
            groupChat,
            name,
            avatar: members.slice(0, 3).map(({ avatar }) => avatar.url),
        })
        );

        return res.status(200).json({
            success: true,
            groups: groups,
            message: "Successfully fetched groups"
        })

    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message
        })

    }
}

const addMembers = async (req, res, next) => {
    try {
        // sending the chatid on which the members will be added 
        // along with the members who will be added 
        const { chatId, members } = req.body;



        const chat = await Chat.findById(chatId);

        // if chat is not found
        if (!chat) return next(new ErrorHAndler("chat not found", 404));

        // if the chat is not a group chat
        if (!chat.groupChat) return next(new ErrorHAndler("This is not a group chat", 400));

        // if u r not the creator obviously  can't add members
        if (chat.creator.toString() !== req.user._id.toString()) return next(new ErrorHAndler("You are not allowed to add members", 403));

        // add all new members name
        const allNewMembersPromise = members.map((i) => User.findById(i, "name"));

        const allnewMembers = await Promise.all(allNewMembersPromise);

        // checking for only unique members to be added (which are not present in chat and mapping their ids)
        const uniqueMembers = allnewMembers.filter((i) => !chat.members.includes(i._id.toString())).map((i) => i._id);

        // finally adding the new members on the group chat
        chat.members.push(...uniqueMembers);

        // setting the limit for the numbers of members
        if (chat.members.length > 100) return next(new ErrorHAndler("Group members limit reached", 400));

        // else
        await chat.save();

        const allUSersName = allnewMembers.map((i) => i.name).join(",");
        emitEvent(req, ALERT, chat.members, `${allUSersName} has been added to ${chat.name} group`);
        emitEvent(req, REFETCH_CHATS, chat.members);

        return res.status(200).json({
            success: true,
            chat,
            message: `Successfully added new members in the ${chat.name} group`
        })

    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message
        })

    }


}

const removeMember = async (req, res, next) => {
    try {
        const { userId, chatId } = req.body
        const [chat, userThatwillberemoved] = await Promise.all([
            Chat.findById(chatId),
            User.findById(userId, "name"),
        ]);

        if (!chat) return next(new ErrorHAndler("Chat not found", 400));
        // if the chat is not a group chat
        if (!chat.groupChat) return next(new ErrorHAndler("This is not a group chat", 400));

        // if u r not the creator obviously  can't add members
        if (chat.creator.toString() !== req.user._id.toString()) return next(new ErrorHAndler("You are not allowed to add members", 403));

        if (chat.members.length <= 3) return next(new ErrorHAndler("Group must have atleast 3 members", 400));

        if (!userThatwillberemoved) return next(new ErrorHAndler("User not found", 400));

        const allChatMembers = chat.members.map((i) => i.toString());

        // now filetring out the other members other than the removed member
        chat.members = chat.members.filter((member) => member.toString() !== userId.toString());

        await chat.save();

        emitEvent(req, ALERT, chat.members,
            {
                message: `${userThatwillberemoved.name} is remived from the group chat`,
                chatId
            }
        )
        emitEvent(req, REFETCH_CHATS, allChatMembers);

        return res.status(200).json({
            success: true,
            message: "Member removed successfully"
        })
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message
        })
    }
}

const leaveGroup = async (req, res, next) => {
    try {
        const chatId = req.params.chatId;
        const chat = await Chat.findById(chatId);
        const user = await User.findById(req.user);
        if (!chat) return next(new ErrorHAndler("Chat not found", 400));

        // if the chat is not a group chat
        if (!chat.groupChat) return next(new ErrorHAndler("This is not a group chat", 400));

        const remainingUsers = chat.members.filter(
            (member) => member.toString() !== req.user._id.toString()
        )

        if (remainingUsers.length < 3) return next(new ErrorHAndler("Group must have atleast 3 members", 400));

        if (chat.creator.toString() === req.user._id.toString()) {
            // assigning a random user as a new creator
            const randomUserIndex = Math.floor(Math.random() * remainingUsers.length);
            const newCreator = remainingUsers[randomUserIndex];

            chat.creator = newCreator;
        }

        //  remaining  group members 
        chat.members = remainingUsers;

        await chat.save();

        emitEvent(req, ALERT, chat.members, {
            chatId,
            message: `${user.name} has left the group chat`
        });


        return res.status(200).json({
            success: true,
            message: "Member left the group successfully"
        })
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message
        })
    }
};


const sendAttachments = async (req, res, next) => {
    try {
        const { chatId } = req.body;

        const files = req.files || [];
        // console.log("files:", files);

        if (files.length < 1) return next(new ErrorHAndler("please upload Attachments", 400));
        if (files.length > 6) return next(new ErrorHAndler("Files Can't be more than 5", 400));


        // fetched the chat and the user who want to send attachments
        const [chat, me] = await Promise.all([
            Chat.findById(chatId),
            User.findById(req.user._id, "name")
        ])
        if (!chat) return next(new ErrorHAndler("Chat not found", 404));



        // upload files here
        const attachments = await uploadFilesToCloudinary(files);

        const messageForDB = {
            content: "",
            attachments,
            sender: me._id,
            chat: chatId
        };
        // will be done by soket io for realtime data sending
        const messageForRealtime = {
            ...messageForDB,
            sender: {
                _id: me._id,
                name: me.name,
            },
        };

        const message = await Message.create(messageForDB);

        emitEvent(req, NEW_MESSAGE, chat.members, {
            message: messageForRealtime,
            chatId
        });

        emitEvent(req, NEW_MESSAGE_ALERT, chat.members, { chatId });

        return res.status(200).json({
            success: true,
            message,
        })
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message
        })
    }
}


const getChatDetails = async (req, res, next) => {
    try {
        if (req.query.populate === "true") {
            // the lean function will help to populate without saving in the database
            const chat = await Chat.findById(req.params.chatId).populate(
                "members", "name avatar").lean();

            if (!chat) return next(new ErrorHAndler("Chat not found", 400));

            // transforming  chat
            chat.members = chat.members.map(({ _id, name, avatar }) => ({
                _id,
                name,
                avatar: avatar.url,
            }));


            return res.status(200).json({
                success: true,
                chat
            })

        } else {
            const chat = await Chat.findById(req.params.chatId);
            if (!chat) return next(new ErrorHAndler("Chat not found", 400));

            return res.status(200).json({
                success: true,
                chat
            })
        }
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message
        })
    }
}

const renameGroup = async (req, res, next) => {
    try {
        const chatId = req.params.chatId;
        const { name } = req.body;

        const chat = await Chat.findById(chatId);
        if (!chat) return next(new ErrorHAndler("Chat not found", 400));

        if (!chat.groupChat) return next(new ErrorHAndler("this is not a group chat", 403));

        if (chat.creator.toString() !== req.user._id.toString()) {
            return next(new ErrorHAndler("Only admin can rename the group", 403));
        }

        // updating name here
        chat.name = name;
        await chat.save();

        emitEvent(req, REFETCH_CHATS, chat.members);

        return res.status(200).json({
            success: true,
            message: "group renamed successfully"
        })

    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message
        })
    }
}

const deleteChat = async (req, res, next) => {
    try {
        const chatId = req.params.chatId;


        const chat = await Chat.findById(chatId);
        if (!chat) return next(new ErrorHAndler("Chat not found", 400));

        if (chat.groupChat && chat.creator.toString() !== req.user._id.toString()) {
            return next(new ErrorHAndler("Only admin can delete this  group", 403));
        }
        if (!chat.groupChat && !chat.members.includes(req.user._id.toString())) {
            return next(new ErrorHAndler("You are not in this group, how can you delete this group", 403));
        }

        // now deleting 
        // here i have to delete all the messages as well as  all the attachments or files from cloudinary 

        const messagesWithAttachments = await Message.find({
            chat: chatId,

            // exist true means that attachments is available
            // and $ne means it can not be an empty array
            attachments: { $exists: true, $ne: [] },
        });

        const public_ids = [];

        messagesWithAttachments.forEach(({ attachment }) => {
            attachment.forEach(({ public_id }) => {
                public_ids.push(public_id);
            });
        });

        await Promise.all([
            // delete files from cloudinary
            deleteFilesfromCloudinary(public_ids),
            chat.deleteOne(),
            Message.deleteMany({ chat: chatId }),
        ])


        emitEvent(req, REFETCH_CHATS, chat.members);

        return res.status(200).json({
            success: true,
            message: "Chat deleted successfully"
        })

    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message
        })
    }
}

const getMessages = async (req, res, next) => {
    try {
        // page wise logic 
        const chatId = req.params.chatId;
        const { page = 1 } = req.query;

        const perPageLimit = 20;
        const skip = (page - 1) * perPageLimit;

        const chat = await Chat.findById(chatId);
        if (!chat) return next(new ErrorHAndler("Chat not found", 404));


        if (!chat.members.includes(req.user._id.toString())) return next(new ErrorHAndler("Yor are not a allowed access this chat", 403));

        // fetching all the messages from a particular chatId
        const [messages, totalMessagesCount] = await Promise.all([
            Message.find({ chat: chatId })
                .sort({ createdAt: -1 }) //sorted in descending order
                .skip(skip)
                .limit(perPageLimit)
                .populate("sender", "name")
                .lean(),
            Message.countDocuments({ chat: chatId }),
        ]);

        const totalPages = Math.ceil(totalMessagesCount / perPageLimit);

        return res.status(200).json({
            success: true,
            messages: messages.reverse(),
            totalPages
        })
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message
        })
    }
}

export {
    addMembers, deleteChat, getChatDetails, getMessages, getmyChat,
    getMyGroups, leaveGroup, newGroupChat, removeMember, renameGroup, sendAttachments
};
