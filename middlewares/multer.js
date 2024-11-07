import multer from "multer";

// this is middleware it will be used when file is involved

const multerUpload = multer({
    // it also has a property for storage either in ram or disk
    // now it will stored in buffer then it will be  uploaded in cloudinary
    limits:{
        fileSize: 1024 * 1024 * 5,
    },
});

const singleAvatar = multerUpload.single("avatar");
// last number indicates number of files
const attachmentsMulter = multerUpload.array("files",5);

export {singleAvatar, attachmentsMulter};