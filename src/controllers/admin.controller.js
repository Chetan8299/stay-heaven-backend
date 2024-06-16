import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Hotel } from "../models/hotel.model.js";
import { User } from "../models/user.model.js";


const getAllHotels = asyncHandler(async (req, res) => {
    const hotels = await Hotel.find();
    return res
      .status(200)
      .json(new ApiResponse(200, { hotels }, "Hotels fetched successfully"));
  });

const approveHotel = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const hotel = await Hotel.findById(id);
  if (!hotel) {
    throw new ApiError(404, "Hotel not found");
  }
  hotel.approvalStatus = req.body.approvalStatus;
  await hotel.save();

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Hotel approved successfully"));
});

const removeHotel = asyncHandler(async (req, res) => {
    const { id } = req.params;
    await Hotel.findByIdAndDelete(id);

    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Hotel deleted successfully"));
})

const getAllUsers = asyncHandler(async (req, res) => {
    const users = await User.find();
    return res
      .status(200)
      .json(new ApiResponse(200, { users }, "Users fetched successfully"));
})

const makeAdmin = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) {
      throw new ApiError(404, "User not found");
    }
    user.isAdmin = true;
    await user.save();

    return res
      .status(200)
      .json(new ApiResponse(200, {}, "User made admin successfully"));
})

const removeAdmin = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) {
      throw new ApiError(404, "User not found");
    }
    user.isAdmin = false;
    await user.save();

    return res
      .status(200)
      .json(new ApiResponse(200, {}, "User removed admin successfully"));
})

const banUser = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) {
      throw new ApiError(404, "User not found");
    }
    user.isCreator = false;
    await user.save();

    return res
      .status(200)
      .json(new ApiResponse(200, {}, "User banned successfully"));
})

export { getAllHotels, approveHotel, removeHotel, getAllUsers, makeAdmin, removeAdmin, banUser };
