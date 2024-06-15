import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Comment } from "../models/comment.model.js";
import { Hotel } from "../models/hotel.model.js";

const createComment = asyncHandler(async (req, res) => {
    const id = req.user?._id;

    if (!id) {
        throw new ApiError(401, "Unauthorized request");
    }

    const { message, rating } = req.body;

    if (!message || !rating) {
        throw new ApiError(400, "All fields are required");
    }

    const comment = await Comment.create({
        user: id,
        message,
        rating
    });

    const hotelId = req.params.id;

    const hotel = await Hotel.findByIdAndUpdate(hotelId, {
        $push: {
            comments: comment._id
        }
    })
    hotel.save()

    return res
        .status(200)
        .json(new ApiResponse(200, comment, "Comment created successfully"));
})

const deleteComment = asyncHandler(async (req, res) => {

    const commentId = req.params.id;
    const comment = await Comment.findByIdAndDelete(commentId);

    const hotelId = req.body.hotelId;

    const hotel = await Hotel.findById(hotelId)

    if (!hotel) {
        throw new ApiError(404, "Hotel not found");
    }

    hotel.comments = hotel.comments.filter(comment => comment.toString() !== commentId.toString());
    hotel.save();

    return res.status(200).json(new ApiResponse(200, comment, "Comment deleted successfully"));
})

export {createComment, deleteComment}