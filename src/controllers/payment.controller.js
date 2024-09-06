import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import Razorpay from "razorpay";
import { Hotel } from './../models/hotel.model.js';

const instance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
})

const checkout = asyncHandler(async (req,res) => {
    const { rooms, days, hotelId } = req.body;
    const hotel = await Hotel.findById(hotelId);

    if (!hotel) {
        throw new ApiError(404, "Hotel not found");
    }

    const price = hotel.price;

    const total = rooms*days*price ;

    const options = {
        amount: total*100,
        currency: "INR",
    }

    const order = await instance.orders.create(options);


    return res.status(200).json(new ApiResponse(200, { order }, "Payment initiated successfully"));
 
})

const paymentverification = asyncHandler(async (req,res) => {
    console.log(req.body);
    return res.status(200).json(new ApiResponse(200, {  }, "Payment initiated successfully"));
})

const getkey = asyncHandler(async (req,res) => {
    return res.status(200).json(new ApiResponse(200, { key: process.env.RAZORPAY_KEY_ID }, "Razorpay key fetched successfully"));
});

export { checkout, paymentverification, getkey };
