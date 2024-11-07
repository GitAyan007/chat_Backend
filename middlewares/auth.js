import jwt from "jsonwebtoken";
import { ErrorHAndler } from "../utils/utility.js";
import { User } from "../model/user.js";

const isAuthenticated = async (req, res, next) => {
    try {
        const token = req.cookies['chitchat-token'];
        if (!token) return next(new ErrorHAndler("Please login first to get profile ", 401));

        const decodedData = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await User.findById(decodedData._id);

        next();
    } catch (error) {

    }
};

const adminOnly = async (req, res, next) => {
    try {
        const token = req.cookies['admin-token'];
        if (!token) return next(new ErrorHAndler("ONLY ADMIN CAN ACCESS", 401));

        const secretKey = jwt.verify(token, process.env.JWT_SECRET);

        const adminSecretKey = process.env.ADMIN_SECRET_KEY || "abc";
        const isMatched = secretKey === adminSecretKey;

        if (!isMatched) return next(new ErrorHAndler("Wrong Secret Key", 401));

        next();
    } catch (error) {

    }
}

const socketAuthenticator = async (err, socket, next) => {
    try {

        if (err) return next(err);

        const authToken = socket.request.cookies["chitchat-token"];

        if (!authToken)
            return next(new ErrorHAndler("Please login to access this routes", 401));

        const decodedData = jwt.verify(authToken, process.env.JWT_SECRET);

        const user = await User.findById(decodedData._id);
        if(!user) return next(new ErrorHAndler("Please login to access this routes", 401));

        socket.user = user;
        
        return next();

    } catch (error) {
        console.log(err);
        return next(new ErrorHAndler("Please login to access this routes", 401));
    }
};
export { isAuthenticated, adminOnly, socketAuthenticator };