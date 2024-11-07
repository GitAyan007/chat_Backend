import express from "express";
import { adminLogin, adminLogout, AllChats, AllMessages, AllUsers, getAdmin, getDashboard } from "../controllers/admin.js";
import { adminLoginValidator, validate } from "../lib/validators.js";
import { adminOnly } from "../middlewares/auth.js";

const route = express.Router();



route.post("/verify",adminLoginValidator(), validate, adminLogin);

route.get("/logout", adminLogout);


// ONLY ADMIN CAN ACCESS THIS ROUTES ------>
route.use(adminOnly);

route.get("/",getAdmin);

// for statistics ---->
route.get("/users", AllUsers);
route.get("/chats", AllChats);
route.get("/messages", AllMessages);

route.get("/stats", getDashboard);


export default route;