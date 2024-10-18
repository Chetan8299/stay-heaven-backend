import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Hotel } from "../models/hotel.model.js";
import mongoose from "mongoose";
import { Order } from "../models/order.model.js";
import { io } from "../app.js";

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
    pdf
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
    !pinCode ||
    !pdf
  ) {
    throw new ApiError(400, "All fields are required");
  }

  const user = await User.findById(req.user?._id);

  if (!user) {
    throw new ApiError(401, "Unauthorized request");
  }

  if (!user.isCreator) {
    throw new ApiError(400, "You cannot create a hotel for yourself");
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
    owner: req.user?._id,
    pdf: pdf
  });

  const createdHotel = await Hotel.findById(hotel._id);

  if (!createdHotel) {
    throw new ApiError(500, "Something went wrong while creating hotel");
  }
  user.myCreatedPlaces.push(createdHotel._id);
  user.save();

  
  io.emit("hotel_is_created", { hotel: createdHotel });


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
    approvalStatus: "approved",
  });
  return res
    .status(200)
    .json(new ApiResponse(200, { hotels }, "Hotels fetched successfully"));
});

const getHotelDetails = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const hotel = await Hotel.findById(id).populate({
    path: "comments",
    populate: {
      path: "user",
      model: "User",
      select: "username avatar fullName",
    },
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
  const user = await User.findById(req.user?._id).populate("previousBookings"); 
  if (!user) {
    throw new ApiError(401, "Unauthorized request");
  }
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user.previousBookings,
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
    .json(
      new ApiResponse(
        200,
        user.myCreatedPlaces,
        "My created places fetched successfully"
      )
    );
});

const deleteMyCreatedPlace = asyncHandler(async (req, res) => {
  let { id } = req.body;
  await Hotel.findByIdAndDelete(id);

  const user = await User.findById(req.user?._id);

  if (!user) {
    throw new ApiError(401, "Unauthorized request");
  }



  user.myCreatedPlaces = user.myCreatedPlaces.filter(
    (hotel) => hotel._id !== id
  );

  await user.save();

  io.emit("hotel_deleted", id)

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Hotel deleted successfully"));
});

const deleteRequest = asyncHandler(async (req, res) => {
  const { id, reason } = req.body;

  const hotel = await Hotel.findById(id).populate("owner");
  if (!hotel) {
    throw new ApiError(404, "Hotel not found");
  }

  hotel.deleteReason = reason;
  hotel.deleted = true;
  await hotel.save();
  
  io.emit("hotel_delete_req_sent", { hotel: hotel });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Hotel delete request sent successfully"));
});

const undoDeleteRequest = asyncHandler(async (req, res) => {
  const { id } = req.body;

  const hotel = await Hotel.findById(id);
  if (!hotel) {
    return res
      .status(404)
      .json(new ApiResponse(404, {}, "Hotel not found"));
  }

  hotel.deleted = false;
  hotel.deleteReason = "";
  await hotel.save();

  io.emit("delete_request_undone", { hotel: hotel });
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Delete request undone successfully"));
})



const searchHotel = asyncHandler(async (req, res) => {
  const { wifi, ac, breakfast, parking, kitchen, gym, searchterm, min_price, max_price } = req.query;
  const sort = req.query.sort;
  const order = req.query.order;

  let baseQuery = null;
  if(searchterm){
    baseQuery = {
      $or: [
        { title: { $regex: new RegExp(searchterm, "i") } },
        { city: { $regex: new RegExp(`\\b${searchterm}\\b`, "i") } },
        { state: { $regex: new RegExp(`\\b${searchterm}\\b`, "i") } },
      ],
    };
  }

  const additionalQueries = [];

  if (wifi) {
    additionalQueries.push({ facilities: { $regex: /wifi/i } });
  }
  if (ac) {
    additionalQueries.push({ facilities: { $regex: /ac/i } });
  }
  if (breakfast) {
    additionalQueries.push({ facilities: { $regex: /breakfast/i } });
  }
  if (parking) {
    additionalQueries.push({ facilities: { $regex: /parking/i } });
  }
  if (kitchen) {
    additionalQueries.push({ facilities: { $regex: /kitchen/i } });
  }
  if (gym) {
    additionalQueries.push({ facilities: { $regex: /gym/i } });
  }

  
    const priceQuery = {};
    if (min_price) priceQuery.$gte = min_price;
    if (max_price) priceQuery.$lte = max_price;
    additionalQueries.push({ price: priceQuery });
  

  let finalQuery;
  if(additionalQueries.length > 0 && baseQuery){
    finalQuery = { $and: [baseQuery, ...additionalQueries] };
  }
  else if(additionalQueries.length > 0){
    finalQuery = { $and: [...additionalQueries] };
  }
  else if(baseQuery){
    finalQuery = baseQuery;
  }

  let hotels;
  if(sort && order){
    hotels = await Hotel.find(finalQuery?finalQuery:null).sort({ [sort]: order });
  }
  else{
    hotels = await Hotel.find(finalQuery?finalQuery:null);
    console.log(hotels);
  }
  

  return res
    .status(200)
    .json(new ApiResponse(200, { hotels }, "Hotels fetched successfully"));
});


export {
  createHotel,
  fetchAllHotels,
  getHotelDetails,
  editHotel,
  myPreviousBooking,
  myCreatedPlaces,
  searchHotel,
  deleteMyCreatedPlace,
  deleteRequest,
  undoDeleteRequest
};
