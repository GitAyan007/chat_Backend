import mongoose ,{ Schema, model, Types } from "mongoose";

const requestSchema = new Schema(
    {
        sender: {
            type: Types.ObjectId,
            ref: "User",
            required: true
        },
        receiver: {
            type: Types.ObjectId,
            ref: "User",
            required: true
        },
        status: {
            type: String,
            default:"pending",
            enum:["pending", "accepted", "rejected"], 
        },
    }, 
    {
    timestamps: true,
}
);

export const Request = mongoose.models.Request || model("Request", requestSchema);