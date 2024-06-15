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
    pinCode,
    images,
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
    !pinCode
  ) {
    throw new ApiError(400, "All fields are required");
  }

  const user = await User.findById(req.user?._id);

  if (!user) {
    throw new ApiError(401, "Unauthorized request");
  }

  const hotel = await Hotel.create({
    title,
    description,
    price,
    facilities,
    address,
    maxGuests,
    city,
    state,
    pinCode,
    images,
  });

  const createdHotel = await Hotel.findById(hotel._id);

  if (!createdHotel) {
    throw new ApiError(500, "Something went wrong while creating hotel");
  }
  user.myCreatedPlaces.push(createdHotel._id);
  user.save();

  return res
    .status(200)
    .json(new ApiResponse(200, { createdHotel }, "Hotel created successfully"));
});

const editHotel = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const hotel = await Hotel.findById(id);
  if (!hotel) {
    throw new ApiError(404, "Hotel not found");
  }

  const {
    title,
    description,
    price,
    facilities,
    address,
    maxGuests,
    city,
    state,
    images,
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
    !images ||
    !pinCode
  ) {
    throw new ApiError(400, "All fields are required");
  }

  await Hotel.findByIdAndUpdate(
    id,
    {
      $set: {
        title,
        description,
        price,
        facilities,
        address,
        maxGuests,
        city,
        state,
        images,
        pinCode,
      },
    },
    { new: true }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Hotel updated successfully"));
});

const fetchAllHotels = asyncHandler(async (req, res) => {
  const hotels = await Hotel.find({});
  return res
    .status(200)
    .json(new ApiResponse(200, { hotels }, "Hotels fetched successfully"));
});

const getHotelDetails = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const hotel = await Hotel.findById(id);
  if (!hotel) {
    throw new ApiError(404, "Hotel not found");
  }
  return res
    .status(200)
    .json(
      new ApiResponse(200, { hotel }, "Hotel details fetched successfully")
    );
});

const myPreviousBooking = asyncHandler(async (req, res) => {
  const { id } = req.body;
  const user = await User.findById(req.user?._id);
  if (!user) {
    throw new ApiError(401, "Unauthorized request");
  }

  user.previousBookings.push(id);
  user.save();

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {},
        "Hotel Added to my previous bookings successfully"
      )
    );
});

const myCreatedPlaces = asyncHandler(async (req, res) => {
  console.log("hi");
  console.log("req.user: ", req.user?._id);
  const user = await User.findById(req.user?._id);

  if (!user) {
    throw new ApiError(401, "Unauthorized request");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, user.myCreatedPlaces, "My created places fetched successfully"));
});

const searchHotel = asyncHandler(async (req, res) => {
  const { query } = req.body;
  const hotels = await Hotel.find({
    $or: [
      { title: { $regex: query, $options: 'i' } },
      { city: { $regex: query, $options: 'i' } },
      { state: { $regex: query, $options: 'i' } },
    ]
  });

  return res.status(200).json(new ApiResponse(200, { hotels }, "Hotels fetched successfully"));
})
export {
  createHotel,
  fetchAllHotels,
  getHotelDetails,
  editHotel,
  myPreviousBooking,
  myCreatedPlaces,
  searchHotel
};