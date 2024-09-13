import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Hotel } from "../models/hotel.model.js";
import { User } from "../models/user.model.js";
import { Order } from "./../models/order.model.js";
import { myCreatedPlaces } from "./hotel.controller.js";

const getAllHotels = asyncHandler(async (req, res) => {
  const hotels = await Hotel.find();
  return res
    .status(200)
    .json(new ApiResponse(200, { hotels }, "Hotels fetched successfully"));
});

const getAllPendingHotels = asyncHandler(async (req, res) => {
  const hotels = await Hotel.find({ approvalStatus: "pending" }).populate("owner");
  return res
    .status(200)
    .json(new ApiResponse(200, { hotels }, "Hotels fetched successfully"));
});

const approveHotel = asyncHandler(async (req, res) => {
  const id = req.body.id;
  const hotel = await Hotel.findById(id);
  if (!hotel) {
    throw new ApiError(404, "Hotel not found");
  }
  hotel.approvalStatus = req.body.approvalStatus;
  await hotel.save();

  return res
    .status(200)
    .json(
      new ApiResponse(200, {}, `Hotel ${req.body.approvalStatus} successfully`)
    );
});

const removeHotel = asyncHandler(async (req, res) => {
  const id = req.body.id;
  await Hotel.findByIdAndDelete(id);
  const user = await User.findOne({
    myCreatedPlaces: {
      $in: [id],
    },
  });
  
  user.myCreatedPlaces = user.myCreatedPlaces.filter(
    (hotelId) => hotelId.toString() !== id.toString()
  );
  user.save();
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Hotel deleted successfully"));
});

const getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find()
  .populate("myCreatedPlaces")
  .populate("previousBookings")
  .populate("receivedOrders");
  return res
    .status(200)
    .json(new ApiResponse(200, { users }, "Users fetched successfully"));
});

const makeAdmin = asyncHandler(async (req, res) => {
  const id = req.body.id;
  const user = await User.findById(id);
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  user.isAdmin = true;
  await user.save();

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "User made admin successfully"));
});
const makeCreator = asyncHandler(async (req, res) => {
  const id = req.body.id;
  const user = await User.findById(id);
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  user.isCreator = true;
  await user.save();

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "User made creator successfully"));
});
const removeCreator = asyncHandler(async (req, res) => {
  const id = req.body.id;
  const user = await User.findById(id);
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  user.isCreator = false;
  await user.save();

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "User removed creator successfully"));
});

const removeAdmin = asyncHandler(async (req, res) => {
  const id = req.body.id;
  const user = await User.findById(id);
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  user.isAdmin = false;
  await user.save();

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "User removed admin successfully"));
});

const banUser = asyncHandler(async (req, res) => {
  const id = req.body.id;
  const user = await User.findById(id);
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  user.isban = true;
  await user.save();

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "User banned successfully"));
});
const unbanUser = asyncHandler(async (req, res) => {
  const id = req.body.id;
  const user = await User.findById(id);
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  user.isban = false;
  await user.save();

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "User banned successfully"));
});

const allOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find().populate("customer");
  return res
    .status(200)
    .json(new ApiResponse(200, { orders }, "Orders fetched successfully"));
});

export {
  getAllHotels,
  approveHotel,
  removeHotel,
  getAllUsers,
  makeAdmin,
  removeAdmin,
  makeCreator,
  removeCreator,
  banUser,
  unbanUser,
  allOrders,
  getAllPendingHotels
};
