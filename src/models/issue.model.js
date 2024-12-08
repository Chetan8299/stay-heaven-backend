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
  }
},{timestamps: true});

export const Issue = mongoose.model("Issue", issueSchema);
