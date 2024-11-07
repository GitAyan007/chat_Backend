import { body, validationResult, check, param, query } from "express-validator";
import { ErrorHAndler } from "../utils/utility.js";


const registerValidator = () => [
    body("name", "Please Enter Your name").notEmpty(),
    body("username", "Please Enter Username").notEmpty(),
    body("password", "Please Enter password").notEmpty(),
    body("bio", "Please Enter bio").notEmpty(),
    // check("avatar", "Please upload Avavtar").notEmpty()
];

const loginValidator = () => [
    body("password", "Please Enter password").notEmpty(),
    body("username", "Please Enter Username").notEmpty(),
];

const newGroupChatValidator = () => [
    body("name", "Please Enter name").notEmpty(),
    body("members").notEmpty().withMessage("Please enter Members").isArray({ min: 2, max: 100 }).withMessage("Atleast 2 members should be there! and maximum 100"),
];


const addMembersValidator = () => [
    body("chatId", "Please Enter chatId").notEmpty(),
    body("members").notEmpty().withMessage("Please enter Members").isArray({ min: 1, max: 97 }).withMessage("Atleast 1 members should be there! and maximum 100"),
];

const removeMemberValidator = () => [
    body("chatId", "Please Enter chatId").notEmpty(),
    body("userId", "Please Enter userId").notEmpty(),
];

const ChatIDValidator = () => [
    param("chatId", "Please Enter chatId").notEmpty(),
];


const sendAttachmentsValidator = () => [
    body("chatId", "Please Enter chatId").notEmpty(),
];



const getMessagesValidator = () => [
    param("chatId", "Please Enter chatId").notEmpty(),
    // query("page", "Please Enter Page Number").notEmpty()
];


const renameGroupValidator = () => [
    param("chatId", "Please Enter chatId").notEmpty(),
    body("name", "Please Enter group name").notEmpty()
];



const userIDvalidator = () => [
    body("userId", "Please Enter userId").notEmpty()
]

const acceptFriendRequestValidator = () => [
    body("requestId", "Please Enter Request ID").notEmpty(),
    body("accept").notEmpty().withMessage("Please add accept").isBoolean().withMessage("accept must be a boolean"),
]


const validate = (req, res, next) => {
    const errors = validationResult(req);
    const errorMsg = errors.array().map((error) => error.msg).join(", ");

    if (errors.isEmpty()) return next();
    else next(new ErrorHAndler(errorMsg, 400));
}

const adminLoginValidator = () => [
    body("secretKey", "Please enter secret key").not().isEmpty()
];

export {
    registerValidator,
    validate,
    loginValidator,
    newGroupChatValidator,
    addMembersValidator,
    removeMemberValidator,
    sendAttachmentsValidator,
    getMessagesValidator,
    ChatIDValidator,
    renameGroupValidator,
    userIDvalidator,
    acceptFriendRequestValidator,
    adminLoginValidator
};