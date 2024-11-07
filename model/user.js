import { hash } from "bcrypt";
import mongoose ,{ Schema, model } from "mongoose";

const userSchema = new Schema({
    name:{
        type:String,
        required:true,
    },
    username:{
        type:String,
        required:true,
        unique:true,
    },
    password:{
        type:String,
        required:true,
        // by default it wont be visible until and unless i speaifically show the password
        select:false,
    },
    avatar:{
        public_id:{
            type:String,
            required:true,
        },
        url:{
            type:String,
            required:true,
        }
    },
    bio:{
        type:String,
    }
},{
    timestamps:true,
});

userSchema.pre("save", async function(next){
    // if password is not modified
    if(!this.isModified("password")) return next();

    // new password
    this.password = await hash(this.password,10);
});



// to fix commonJs module issue i imported mongoose separetely
export const  User= mongoose.models.User || model("User", userSchema);