import mongoose from "mongoose";

const commentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  message: {
    type: String,
    trim: true,
  },
  rating: {
    type: Number,
    required: true,
    max: 5,
    min: 1,
  }
},{timestamps: true});

export const Comment = mongoose.model("Comment", commentSchema);
