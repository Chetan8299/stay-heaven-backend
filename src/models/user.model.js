import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
      lowercase: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      trim: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    phoneNumber: {
      type: String,
      unique: true,
      required: true,
      trim: true,
    },
    previousBookings: [
      {
        type: mongoose.Schema.Types.ObjectId,
        generateAccessToken: "Order",
      },
    ],
    myCreatedPlaces: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Hotel",
      },
    ],
    avatar: {
      type: String,
      required: true,
      trim: true,
    },
    isAdmin:{
      type: Boolean,
      default: false,
    },
    isCreator: {
      type: Boolean,
      default: false,
    },
    isban: {
      type: Boolean,
      default: false,
    },
    receivedOrders:[
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Order",
      },
    ],
    sellerRequestMade: {
      type: Boolean,
      default: false
    },
    aadhaar: {
      type: String
    },
    pan: {
      type: String
    },
    address: {
      type: String
    }
    ,
    accessToken: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) next();

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};

userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      username: this.username,
      fullName: this.fullName,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    }
  );
};
export const User = mongoose.model("User", userSchema);
