import express from "express";
import { addMembers, deleteChat, getChatDetails, getMessages, getMyGroups, getmyChat, leaveGroup, newGroupChat, removeMember, renameGroup, sendAttachments } from "../controllers/chat.js";
import { isAuthenticated } from "../middlewares/auth.js";
import { attachmentsMulter } from "../middlewares/multer.js";
import { newGroupChatValidator, addMembersValidator, removeMemberValidator, validate, sendAttachmentsValidator, getMessagesValidator, ChatIDValidator, renameGroupValidator } from "../lib/validators.js";

const route = express.Router();



// from here the user must be logged in to access the routes --------->

// --------> i can use the middleware here so that i dont have to write it many times
route.use(isAuthenticated);

route.post("/newGroupChat", newGroupChatValidator(), validate, newGroupChat);
route.get("/getmyChat", getmyChat);
route.get("/getmyGroups", getMyGroups);
route.put("/addMembers", addMembersValidator(), validate, addMembers);
route.put("/removeMember", removeMemberValidator(), validate, removeMember);
route.delete("/leaveGroup/:chatId", ChatIDValidator(), validate, leaveGroup);
// send attachments------------->
route.post("/message", attachmentsMulter, sendAttachmentsValidator(), validate, sendAttachments);

// get messages---------------->
route.get("/getMessage/:chatId", getMessagesValidator(), validate, getMessages);

// get chat (details,  rename, delete)----------->
// here the routes will be same for the three(details, rename, delete)
// new way to write them 

// originally
// route.get("chat/:chatId",FuncA);
// route.put("chat/:chatId",FuncB);
// route.delete("chat/:chatId",FuncC);

// i can write this way 
route.route("/:chatId")
    .get(ChatIDValidator(), validate, getChatDetails)
    .put(renameGroupValidator(), validate, renameGroup)
    .delete(ChatIDValidator(), validate, deleteChat);

export default route;