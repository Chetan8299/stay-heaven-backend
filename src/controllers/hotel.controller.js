import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Hotel } from "../models/hotel.model.js";

const createHotel = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    price,
    facilities,
    address,
    maxGuests,
    city,
    state,
    country,
    pinCode,
  } = req.body;

  if (
    !title ||
    !description ||
    !price ||
    !facilities ||
    !address ||
    !maxGuests ||
    !city ||
    !state ||
    !country ||
    !pinCode
  ) {
    throw new ApiError(400, "All fields are required");
  }

  const user = User.findById(req.user?._id);

  if (!user) {
    throw new ApiError(401, "Unauthorized request");
  }


  return res.status(200).json(new ApiResponse(200, { files: req.files}, "Hotel created"));
});


export {createHotel}