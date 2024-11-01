import mongoose from "mongoose";

const tempOrderSchema = new mongoose.Schema({
  uniqueId: {
    type: String,
  },
  hotelId: {
    type: Object,
  },
  checkin: {
    type: String,
    trim: true,
  },
  checkout: {
    type: String,
    trim: true,
  },
  rooms: {
    type: Number,
    trim: true,
  },
  amount: {
    type: Number,
    trim: true,
  },
  guests: {
    type: Array,
  },
  paymentDetails: {
    type: Object,
  },
  userId: {
    type: String
  }
},{timestamps: true});

export const TempOrder = mongoose.model("TempOrder", tempOrderSchema);