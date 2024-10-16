import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import nodemailer from "nodemailer";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { Order } from "../models/order.model.js";
import { io } from "../app.js";
import { Hotel } from "../models/hotel.model.js";

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating access and refresh token"
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

  const { fullName, email, username, password, phoneNumber, avatar } = req.body;

  if (
    [fullName, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }

  if (phoneNumber.length !== 10) {
    throw new ApiError(400, "Phone number must be 10 digits");
  }

  const existedUser = await User.findOne({
    $or: [{ username }, { email }, { phoneNumber }],
  });

  if (existedUser) {
    throw new ApiError(
      409,
      "User with email or username or phone number already exists"
    );
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
    .json(new ApiResponse(200, createdUser, "User registered successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  // req body ->  data
  // username or email
  // find user in db
  // check if password is correct
  // access and refresh token
  // send cookie
  const { identity, password } = req.body;
  const email = identity;
  const username = identity;
  let emailUsername;
  // console.log("email: ", email);
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  function isValidEmail(email) {
    return emailRegex.test(email);
  }

  // console.log("is Valid Email: ", isValidEmail(email));
  if (isValidEmail(email)) {
    emailUsername = { email: email };
  } else {
    emailUsername = { username: username };
  }

  // console.log("emailUsername: ", emailUsername);
  if (!emailUsername) {
    throw new ApiError(400, "Username or Email is required"); // wapas ana email ke liye
  }

  const user = await User.findOne(emailUsername);

  // console.log("user: ", user);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid password");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: true,
  };
  

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
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
        refreshToken: 1,
      },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  try {
    const incomingRefreshToken =
      req.cookies.refreshToken || req.body.refreshToken;
    if (!incomingRefreshToken) {
      throw new ApiError(401, "Unauthorized request");
    }

    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refreash Token is expired or used");
    }

    const options = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
      user._id
    );

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: refreshToken },
          "Access token refreshed successfully"
        )
      );
  } catch (error) {
    throw new ApiError(
      401,
      error?.message || "Something went wrong while refreshing access token"
    );
  }
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
  if(!req.user) {
    console.log("not logged in")
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
  if (!fullName || !email || !username || !phoneNumber || !avatar) {
    throw new ApiError(400, "All fields are required");
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
    .json(new ApiResponse(200, user, "Account details updated successfully"));
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  const { avatar } = req.body;

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
  const { username } = req.body;

  if (!username) {
    throw new ApiError(400, "Username is required");
  }

  const user = await User.findOne({ username });

  if (!user) {
    throw new ApiError(404, "User not found");
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
    text: `Your password reset link is: http://localhost:5173/resetPassword/${user?._id}/${token}`,
  };

  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log(error, "mail error");
    } else {
      console.log("Email sent: " + info.response);
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

  const user = await User.findById(id);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const decodedToken = jwt.verify(
    token,
    process.env.RESET_TOKEN_SECRET,
    async (err, decoded) => {
      if (err) {
        return res.status(400).json(new ApiError(401, "Invalid token"));
      } else {
        user.password = password;
        user.save({ validateBeforeSave: false });
        return res.status(200).json(new ApiResponse(200, {}, "Password reset"));
      }
    }
  );
});

const getOrders = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user?._id).populate({
    path: 'receivedOrders',
    populate: {
      path: 'customer',
      select: 'fullName phoneNumber email'
    }
  });
  return res
    .status(200)
    .json(new ApiResponse(200, {orders:user.receivedOrders}, "Orders fetched"));
});

const approveOrder = asyncHandler(async (req, res) => {
  const id = req.body.id;
  const order = await Order.findById(id);
  if (!order) {
    throw new ApiError(404, "Order not found");
  }
  order.approvalStatus = req.body.approvalStatus;
  if(order.approvalStatus === "confirmed") {
    const hotel = await Hotel.findById(order.hotel._id);
    hotel.revenue += order.amount - 0.05 * order.amount;
    await hotel.save();
  } 

  await order.save();
  return res
    .status(200)
    .json(
      new ApiResponse(200, {}, `Order ${req.body.approvalStatus} successfully`)
    );
});

const getSellerDashBoardData = asyncHandler(async (req, res) => {
  console.log()
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

  const user = await User.findById(req.user?._id)
    .populate({
      path: 'myCreatedPlaces',
      match: dateFilter, 
    })
    .populate({
      path: 'previousBookings',
      match: dateFilter, 
    })
    .populate({
      path: 'receivedOrders',
      match: dateFilter, 
    });

    const totalBookings = user.previousBookings?.length || 0;
    const totalCreatedPlaces = user.myCreatedPlaces?.length || 0;
    const totalRevenue = user.receivedOrders?.reduce((acc, order) => order.approvalStatus === "confirmed" ? acc + order.amount: acc, 0)

  return res
    .status(200)
    .json(
      new ApiResponse(200, { totalBookings,
        totalCreatedPlaces,
        totalRevenue,
        receivedOrders: user.receivedOrders
         }, "Orders and users fetched successfully")
    );
});

const getSellerData = asyncHandler(async (req, res) => {
  const {address, aadhaar, pan} = req.body;
  console.log(address, aadhaar, pan)
  if(!address || !aadhaar || !pan) {
    throw new ApiError(400, "All fields are required");
  }
  
  const user = await User.findById(req.user?._id)

  if(!user) {
    throw new ApiError(401, "Unauthorized request");
  }

  user.aadhaar = aadhaar;
  user.pan = pan;
  user.address = address;
  user.sellerRequestMade = true,
  await user.save();


  io.emit("seller_request_made", {seller: user});

  return res.status(200).json(new ApiResponse(200, {user}, "Seller data updated successfully"));
})

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  forgotPassword,
  resetPassword,
  getOrders,
  approveOrder,
  getSellerDashBoardData,
  getSellerData
};
