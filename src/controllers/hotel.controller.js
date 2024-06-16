import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Hotel } from "../models/hotel.model.js";
import mongoose from "mongoose";
import { Order } from "../models/order.model.js";

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
        approvalStatus: "pending",
      },
    },
    { new: true }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Hotel updated successfully"));
});

const fetchAllHotels = asyncHandler(async (req, res) => {
  const hotels = await Hotel.find({
    approvalStatus: "approved"
  });
  return res
    .status(200)
    .json(new ApiResponse(200, { hotels }, "Hotels fetched successfully"));
});

const getHotelDetails = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const hotel = await Hotel.findById(id)
    .populate({
      path: 'comments',
      populate: {
        path: 'user',
        model: 'User',
        select: 'username avatar fullName'
      }
    });
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
  const user = await User.findById(req.user?._id);

  if (!user) {
    throw new ApiError(401, "Unauthorized request");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, user.myCreatedPlaces, "My created places fetched successfully"));
});

const deleteMyCreatedPlace = asyncHandler(async (req, res) => {
  let { id } = req.params;
  await Hotel.findByIdAndDelete(id);

  const user = await User.findById(req.user?._id);

  if (!user) {
    throw new ApiError(401, "Unauthorized request");
  }

  const idStr = id.toString();

  user.myCreatedPlaces = user.myCreatedPlaces.filter(hotel => hotel.toString() !== idStr);

  await user.save();

  return res.status(200).json(new ApiResponse(200, {}, "Hotel deleted successfully"));
});


const searchHotel = asyncHandler(async (req, res) => {
  const { soda, cocaCola, searchterm } = req.query;

  const baseQuery = {
    $or: [
      { title: { $regex: new RegExp(searchterm, 'i') } },
      { city: { $regex: new RegExp(`\\b${searchterm}\\b`, 'i') } },
      { state: { $regex: new RegExp(`\\b${searchterm}\\b`, 'i') } }
    ]
  };

  const additionalQueries = [];

  if (soda) {
    additionalQueries.push({ facilities: { $regex: /soda/i } });
  }

  if (cocaCola) {
    additionalQueries.push({ facilities: { $regex: /coca\s*cola/i } });
  }

  const finalQuery = additionalQueries.length > 0
    ? { $and: [baseQuery, ...additionalQueries] }
    : baseQuery;

  const sort = req.query.sort || 'createdAt';
  const order = req.query.order || 'desc';

  const hotels = await Hotel.find(finalQuery).sort({ [sort]: order });

  return res.status(200).json(new ApiResponse(200, { hotels }, "Hotels fetched successfully"));
});

const orderHotel = asyncHandler(async (req, res) => {
  const {hotelId, checkin, checkout, rooms, amount, userId} = req.body;

  const order = await Order.create({
    hotelId,
    checkin,
    checkout,
    rooms,
    amount
  })
  const user = await User.findById(userId);
  user.previousBookings.push(order._id);
  user.save();

  return res.status(200).json( new ApiResponse(200, {}, "Order created successfully") );
})

export {
  createHotel,
  fetchAllHotels,
  getHotelDetails,
  editHotel,
  myPreviousBooking,
  myCreatedPlaces,
  searchHotel,
  deleteMyCreatedPlace,
  orderHotel,
};