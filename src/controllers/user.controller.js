import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import nodemailer from "nodemailer";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { Order } from "../models/order.model.js";
import { io } from "../app.js";
import { Hotel } from "../models/hotel.model.js";
import { deleteFileFromCloudinary } from "../utils/cloudinary.js";

const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        user.accessToken = accessToken;
        await user.save({ validateBeforeSave: false });
        return { accessToken };
    } catch (error) {
        throw new ApiError(
            500,
            "Something went wrong while generating access token"
        );
    }
};

const registerUser = asyncHandler(async (req, res) => {
    // get user details from frontedn
    // validation - not empty
    // check if user already exists: username, email
    // check for images, check for avatar
    // upload them to cloudinary, avatar
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return res

    const { fullName, email, username, password, phoneNumber, avatar } =
        req.body;

    if (
        [fullName, email, username, password].some(
            (field) => field?.trim() === ""
        )
    ) {
        throw new ApiError(400, "All fields are required");
    }

    if (phoneNumber.length !== 10) {
        throw new ApiError(400, "Phone number must be 10 digits");
    }

    const existedUserByUsername = await User.findOne({ username });
    if (existedUserByUsername) {
        throw new ApiError(409, "User with this username already exists");
    }

    const existedUserByEmail = await User.findOne({ email });
    if (existedUserByEmail) {
        throw new ApiError(409, "User with this email already exists");
    }

    const existedUserByPhoneNumber = await User.findOne({ phoneNumber });
    if (existedUserByPhoneNumber) {
        throw new ApiError(409, "User with this phone number already exists");
    }

    const user = await User.create({
        fullName,
        avatar: avatar,
        email,
        password,
        username: username.toLowerCase(),
        phoneNumber,
    });

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering user");
    }

    io.emit("user_is_created", { user: createdUser });

    return res
        .status(201)
        .json(
            new ApiResponse(200, createdUser, "User registered successfully")
        );
});

const loginUser = asyncHandler(async (req, res) => {
    // req body ->  data
    // username or email
    // find user in db
    // check if password is correct
    // access and refresh token
    // send cookie
    const { identity, password } = req.body;

    if (!identity || !password) {
        throw new ApiError(404, "All fields are required");
    }

    const email = identity;
    const username = identity;
    let emailUsername;
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    function isValidEmail(email) {
        return emailRegex.test(email);
    }

    if (isValidEmail(email)) {
        emailUsername = { email: email };
    } else {
        emailUsername = { username: username };
    }

    if (!emailUsername) {
        throw new ApiError(400, "Username or Email is required"); // wapas ana email ke liye
    }

    const user = await User.findOne(emailUsername);


    if (!user) {
        throw new ApiError(404, "User not found - Username / Email not found");
    }

    const isPasswordValid = await user.isPasswordCorrect(password);

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid password");
    }

    const { accessToken } = await generateAccessAndRefreshToken(user._id);

    const loggedInUser = await User.findById(user._id).select("-password");

    const options = {
        httpOnly: true,
        secure: true,
        sameSite: "none",
    };

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser,
                    accessToken,
                },
                "User logged in successfully"
            )
        );
});

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                accessToken: 1,
            },
        },
        {
            new: true,
        }
    );

    const options = {
        httpOnly: true,
        secure: true,
        sameSite: "none",
    };

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .json(new ApiResponse(200, {}, "User logged out successfully"));
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword, confirmPassword } = req.body;
    if (newPassword !== confirmPassword) {
        throw new ApiError(400, "Passwords do not match");
    }

    const user = await User.findById(req.user?._id);
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

    if (!isPasswordCorrect) {
        throw new ApiError(400, "Invalid old password");
    }

    user.password = newPassword;
    await user.save({ validateBeforeSave: false });

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Password changed successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
    if (!req.user) {
        return res.status(401).json(new ApiError(401, "Unauthorized request"));
    }
    const user = await User.findById(req.user?._id)
        .populate("myCreatedPlaces")
        .populate("previousBookings")
        .populate("receivedOrders");

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Current user fetched successfully"));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
    const { fullName, email, username, phoneNumber, avatar } = req.body;
    const oldUser = await User.findById(req.user?._id);
    const oldFullName = oldUser.fullName;
    const oldEmail = oldUser.email;
    const oldUsername = oldUser.username;
    const oldPhoneNumber = oldUser.phoneNumber;
    const oldAvatar = oldUser.avatar;
    
    if (!fullName || !email || !username || !phoneNumber || !avatar) {
        throw new ApiError(400, "All fields are required");
    }

    if (phoneNumber.length !== 10) {
        throw new ApiError(400, "Phone number must be 10 digits");
    }

    if(fullName === oldFullName && email === oldEmail && username === oldUsername && phoneNumber === oldPhoneNumber && avatar === oldAvatar) {
        console.log("same");
        return res
        .status(200)
        .json(
            new ApiResponse(200, {}, "Account details updated successfully")
        );
    }

    const existedUserByUsername = await User.findOne({ username });
    if (existedUserByUsername && username !== oldUsername) {
        throw new ApiError(409, "User with this username already exists");
    }

    const existedUserByEmail = await User.findOne({ email });
    if (existedUserByEmail && email !== oldEmail) {
        throw new ApiError(409, "User with this email already exists");
    }

    const existedUserByPhoneNumber = await User.findOne({ phoneNumber });
    if (existedUserByPhoneNumber && phoneNumber !== oldPhoneNumber) {
        throw new ApiError(409, "User with this phone number already exists");
    }
    if(avatar !== oldAvatar) {
        await deleteFileFromCloudinary(oldAvatar);
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName: fullName,
                email: email,
                username: username,
                phoneNumber: phoneNumber,
                avatar: avatar,
            },
        },
        { new: true }
    ).select("-password");

    return res
        .status(200)
        .json(
            new ApiResponse(200, user, "Account details updated successfully")
        );
});

const updateUserAvatar = asyncHandler(async (req, res) => {
    const { avatar } = req.body;

    const userurl = await User.findById(req.user?._id);
    await deleteFileFromCloudinary(userurl.avatar);

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar,
            },
        },
        { new: true }
    ).select("-password");

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Avatar updated successfully"));
});

const forgotPassword = asyncHandler(async (req, res) => {
    const { identity } = req.body;

    if (!identity) {
        throw new ApiError(404, "All fields are required");
    }

    const email = identity;
    const username = identity;
    let emailUsername;
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    function isValidEmail(email) {
        return emailRegex.test(email);
    }

    if (isValidEmail(email)) {
        emailUsername = { email: email };
    } else {
        emailUsername = { username: username };
    }

    if (!emailUsername) {
        throw new ApiError(400, "Username or Email is required"); // wapas ana email ke liye
    }

    const user = await User.findOne(emailUsername);

    if (!user) {
        throw new ApiError(404, "User not found - Username / Email not found");
    }

    const token = jwt.sign(
        {
            _id: user._id,
            username: user.username,
        },
        process.env.RESET_TOKEN_SECRET,
        {
            expiresIn: process.env.RESET_TOKEN_EXPIRY,
        }
    );

    var transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: "stayheaven123@gmail.com",
            pass: `${process.env.MAIL_PASSWORD}`,
        },
    });

    var mailOptions = {
        from: "stayheaven123@gmail.com",
        to: user?.email,
        subject: "Reset Password",
        text: `Your password reset link is: ${process.env.FRONTEND_URL}/resetPassword/${user?._id}/${token}`,
    };

    transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
            return res
                .status(400)
                .json(new ApiError(400, "error sending mail"));
        }
    });

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Password reset email sent"));
});

const resetPassword = asyncHandler(async (req, res) => {
    const { id, token } = req.params;
    const { password } = req.body;

    if (!password) {
        throw new ApiError(400, "Password is required");
    }
    if (password.length < 8) {
        throw new ApiError(400, "Password must be at least 8 characters");
    }
    const user = await User.findById(id);

    const decodedToken = jwt.verify(
        token,
        process.env.RESET_TOKEN_SECRET,
        async (err, decoded) => {
            if (err) {
                return res.status(400).json(new ApiError(401, "Invalid token"));
            } else {
                user.password = password;
                user.save({ validateBeforeSave: false });
                return res
                    .status(200)
                    .json(new ApiResponse(200, {}, "Password reset"));
            }
        }
    );
});

const getOrders = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user?._id).populate({
        path: "receivedOrders",
        populate: {
            path: "customer",
            select: "fullName phoneNumber email",
        },
    });
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { orders: user.receivedOrders },
                "Orders fetched"
            )
        );
});

const approveOrder = asyncHandler(async (req, res) => {
    const id = req.body.id;
    const order = await Order.findById(id);
    if (!order) {
        throw new ApiError(404, "Order not found");
    }
    order.approvalStatus = req.body.approvalStatus;
    if (order.approvalStatus === "confirmed") {
        const hotel = await Hotel.findById(order.hotel._id);
        hotel.revenue += order.amount - 0.05 * order.amount;
        await hotel.save();
    }
    io.emit("order_is_accepted_or_rejected", order)
    await order.save();
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {},
                `Order ${req.body.approvalStatus} successfully`
            )
        );
});

const getSellerDashBoardData = asyncHandler(async (req, res) => {
    const { duration } = req.body;

    const now = new Date();

    let dateFilter = {};

    if (duration === "This Week") {
        const last7Days = new Date(now);
        last7Days.setDate(now.getDate() - 7);
        dateFilter = { createdAt: { $gte: last7Days } };
    } else if (duration === "This Month") {
        const last30Days = new Date(now);
        last30Days.setDate(now.getDate() - 30);
        dateFilter = { createdAt: { $gte: last30Days } };
    } else if (duration === "This Year") {
        const last365Days = new Date(now);
        last365Days.setDate(now.getDate() - 365);
        dateFilter = { createdAt: { $gte: last365Days } };
    }

    const user = await User.findById(req.user?._id)
        .populate({
            path: "myCreatedPlaces",
            match: dateFilter,
        })
        .populate({
            path: "previousBookings",
            match: dateFilter,
        })
        .populate({
            path: "receivedOrders",
            match: dateFilter,
        });

    const totalBookings = user.previousBookings?.length || 0;
    const totalCreatedPlaces = user.myCreatedPlaces?.length || 0;
    const totalRevenue = user.receivedOrders?.reduce(
        (acc, order) =>
            order.approvalStatus === "confirmed" ? acc + order.amount : acc,
        0
    );

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {
                    totalBookings,
                    totalCreatedPlaces,
                    totalRevenue,
                    receivedOrders: user.receivedOrders,
                },
                "Orders and users fetched successfully"
            )
        );
});

const getSellerData = asyncHandler(async (req, res) => {
    const { address, aadhaar, pan } = req.body;
    if (!address || !aadhaar || !pan) {
        throw new ApiError(400, "All fields are required");
    }

    const user = await User.findById(req.user?._id);

    if (!user) {
        throw new ApiError(401, "Unauthorized request");
    }

    user.aadhaar = aadhaar;
    user.pan = pan;
    user.address = address;
    (user.sellerRequestMade = true), await user.save();

    io.emit("seller_request_made", { seller: user });

    return res
        .status(200)
        .json(
            new ApiResponse(200, { user }, "Seller data updated successfully")
        );
});

const sendOTP = asyncHandler(async (req, res) => {
    const { email } = req.body;
    const otp = Math.floor(Math.random() * 1000000);
    if (!email) {
        throw new ApiError(400, "Email is required");
    }


    var transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: "stayheaven123@gmail.com",
            pass: `${process.env.MAIL_PASSWORD}`,
        },
    });

    var mailOptions = {
        from: "stayheaven123@gmail.com",
        to: email,
        subject: "OTP Verification - Stay Heaven",
        text: `Your OTP is: ${otp}`,
    };

    transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
            return res
                .status(400)
                .json(new ApiError(400, "error sending mail"));
        }
    });

    return res
        .status(200)
        .json(new ApiResponse(200, {otp}, "OTP sent successfully"));
});

export {
    registerUser,
    loginUser,
    logoutUser,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    forgotPassword,
    resetPassword,
    getOrders,
    approveOrder,
    getSellerDashBoardData,
    getSellerData,
    sendOTP
};
