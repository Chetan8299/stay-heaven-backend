import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Hotel } from "../models/hotel.model.js";
import { User } from "../models/user.model.js";
import { Order } from "./../models/order.model.js";
import { myCreatedPlaces } from "./hotel.controller.js";
import { io } from "../app.js";
import { deleteFileFromCloudinary } from '../utils/cloudinary.js';
import { Issue } from "../models/issue.model.js";

const getAllHotels = asyncHandler(async (req, res) => {
  const hotels = await Hotel.find().populate("owner");
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
  io.emit("hotel_is_approved", { hotel: hotel });
  return res
    .status(200)
    .json(
      new ApiResponse(200, {}, `Hotel ${req.body.approvalStatus} successfully`)
    );
});

const removeHotel = asyncHandler(async (req, res) => {
  const id = req.body.id;

  const hotel = await Hotel.findOne({ _id: id });

  hotel.images.forEach(async (img) => {
    await deleteFileFromCloudinary(img);
  })
  
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
  io.emit("seller_made", { seller: user });
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "User made creator successfully"));
});

const rejectSeller = asyncHandler(async (req, res) => {
  const id = req.body.id;
  const user = await User.findById(id);
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  const result1 = await deleteFileFromCloudinary(user.aadhaar);
  const result2 = await deleteFileFromCloudinary(user.pan);
  
  user.sellerRequestMade = false;
  user.aadhaar = "";
  user.pan = "";
  user.address = "";
  await user.save();
  io.emit("rejected_seller", { seller: user });
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "User rejected seller request successfully"));
});

const removeCreator = asyncHandler(async (req, res) => {
  const id = req.body.id;
  const user = await User.findById(id);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const result1 = await deleteFileFromCloudinary(user.aadhaar);
  const result2 = await deleteFileFromCloudinary(user.pan);
  user.isCreator = false;
  user.sellerRequestMade = false;
  user.aadhaar = "";
  user.pan = "";
  user.address = "";
  await user.save();
  io.emit("remove_creator", { seller: user });

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

const getAdminDashboardData = asyncHandler(async (req, res) => {
  const { duration } = req.body;

  const now = new Date();

  let dateFilter = {};

  if (duration === 'This Week') {
    const last7Days = new Date(now); 
    last7Days.setDate(now.getDate() - 7);
    dateFilter = { createdAt: { $gte: last7Days } };
  } else if (duration === 'This Month') {
    const last30Days = new Date(now); 
    last30Days.setDate(now.getDate() - 30); 
    dateFilter = { createdAt: { $gte: last30Days } };
  } else if (duration === 'This Year') {
    const last365Days = new Date(now);
    last365Days.setDate(now.getDate() - 365);
    dateFilter = { createdAt: { $gte: last365Days } };
  }

  const orders = await Order.find(dateFilter);
  const users = await User.find(dateFilter);

  return res
    .status(200)
    .json(
      new ApiResponse(200, { orders, users }, "Orders and users fetched successfully")
    );
});

const getIssues = asyncHandler(async (req, res) => {
  const issues = await Issue.find().populate("user");
  return res
    .status(200)
    .json(new ApiResponse(200, issues, "Issues fetched successfully"));
});

const updateIssue = asyncHandler(async (req, res) => {
  const {id, status} = req.body;
  const issue = await Issue.findById(id);
  if (!issue) {
    throw new ApiError(404, "Issue not found");
  }
  issue.status = status;
  await issue.save();
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Issue updated successfully"));
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
  getAllPendingHotels,
  getAdminDashboardData,
  rejectSeller,
  getIssues,
  updateIssue,
};
