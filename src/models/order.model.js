import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
  hotelId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Hotel",
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
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  approvalStatus: {
    type: String,
    enum: ["in-progress", "confirmed", "cancelled"],
    default: "in-progress",
  }
},{timestamps: true});

export const Order = mongoose.model("Order", orderSchema);
