import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import Razorpay from "razorpay";
import { Hotel } from './../models/hotel.model.js';
import crypto from "crypto";
import { Order } from "../models/order.model.js";
import { User } from "../models/user.model.js";
import mongoose from "mongoose";
import { io } from "../app.js";

const instance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
})

let orderDetails;
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
    orderDetails = {...orderDetails, rooms, amount: total, hotelId};

    const order = await instance.orders.create(options);


    return res.status(200).json(new ApiResponse(200, { order }, "Payment initiated successfully"));
 
})

const paymentverification = asyncHandler(async (req,res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(body.toString()).digest('hex');
    
    const isAuthentic = expectedSignature === razorpay_signature;
    if(isAuthentic) {
        const hotel = await Hotel.findById(orderDetails.hotelId);
        const order = await Order.create({
            hotel,
            checkin: orderDetails.checkInDate,
            checkout: orderDetails.checkOutDate,
            rooms: orderDetails.rooms,
            amount: orderDetails.amount,
            customer: orderDetails.userId,
            guests: orderDetails.guestNames ,
            paymentDetails: {razorpay_order_id, razorpay_payment_id, razorpay_signature}
        });
        const user = await User.findById(orderDetails.userId);
        user.previousBookings.push(order._id);
        user.save();
        
        const { owner } = await Hotel.findById(orderDetails.hotelId);
        
        const ownerUser = await User.findById(owner);
        
        if (!ownerUser) {
            throw new ApiError(404, "Owner not found");
        }
        ownerUser.receivedOrders.push(order._id);
        ownerUser.save();
        io.emit("order_is_created", { order: order });
        res.redirect(`${process.env.FRONTEND_URL}/success`);
    }   else {
        return res.status(400).json(new ApiResponse(400, {  }, "Payment initiated Failed"));
    } 
})

const getkey = asyncHandler(async (req,res) => {
    const { userId, guestNames,checkInDate,checkOutDate } = req.body;
    orderDetails = {...orderDetails, userId, guestNames, checkInDate, checkOutDate};
    return res.status(200).json(new ApiResponse(200, { key: process.env.RAZORPAY_KEY_ID }, "Razorpay key fetched successfully"));
});

export { checkout, paymentverification, getkey };
