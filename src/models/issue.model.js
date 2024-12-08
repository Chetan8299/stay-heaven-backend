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
},{timestamps: true});

export const Issue = mongoose.model("Issue", issueSchema);
