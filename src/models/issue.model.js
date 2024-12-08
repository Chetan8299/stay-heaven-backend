import mongoose from "mongoose";

const issueSchema = new mongoose.Schema({
  category:{
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  images:{
    type: Array,
  },
  user:{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  status:{
    type: String,
    enum: ["pending", "resolved"],
    default: "pending",
  }
},{timestamps: true});

export const Issue = mongoose.model("Issue", issueSchema);
