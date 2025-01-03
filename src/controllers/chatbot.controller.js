import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import {chatbot} from "../utils/chatbot.js";

export const handleMessage = asyncHandler(async (req, res) => {
  try {
    const { message } = req.body;
    const id = req.user?._id;
    if(!id) {
      throw new ApiError("Unauthorized request", 401);
    }
    if (!message) {
      throw new ApiError("Message is required", 400);
    }
    const response = await chatbot(message, id);
    return res.status(200).json(new ApiResponse(200, response, "Response sent successfully")); 
  } catch (error) {
    return new ApiResponse(error);
  }
});