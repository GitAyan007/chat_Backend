import express from "express";
import { acceptFrienRequest, firstTimeLogin,  getMyFriends,  getMyNotifications,  getMyProfile, login, logout, searchhUser, sendFriendRequest } from "../controllers/user.js";
import { singleAvatar } from "../middlewares/multer.js";
import { isAuthenticated } from "../middlewares/auth.js";
import { acceptFriendRequestValidator, loginValidator, registerValidator,  userIDvalidator,  validate } from "../lib/validators.js";

const route = express.Router();

// middleware - multerUpload will accept a single file name avatar
route.post('/newlogin',singleAvatar, registerValidator(), validate, firstTimeLogin);
route.post('/login',loginValidator(), validate , login);


// from here the user must be logged in to access the routes --------->

// --------> i can use the middleware here so that i dont have to write it many times
route.use(isAuthenticated);

route.get("/myProfile", getMyProfile);
route.get("/logout", logout);
route.get("/searchUser", searchhUser);
route.put("/sendrequest", userIDvalidator(), validate, sendFriendRequest);
// accept/reject request -->
route.put("/acceptorRejectRequest",acceptFriendRequestValidator() , validate, acceptFrienRequest);
// get all requests
route.get("/notifications", getMyNotifications);
// my firends
route.get("/friends", getMyFriends);



export default route;