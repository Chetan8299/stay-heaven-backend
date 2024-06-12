import mongoose from "mongoose";

const hotelSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    index: true,
  },
  images: [String],
  comments: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
    },
  ],
  facilities: [String],
  description: {
    type: String,
    required: true,
    trim: true,
  },
  address: {
    type: String,
    required: true,
    trim: true,
  },
  maxGuests: {
    type: Number,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
});

export const Hotel = mongoose.model("Hotel", hotelSchema);
