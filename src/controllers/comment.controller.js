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
    const newComment = await Comment.findById(comment._id).populate({ path: "user",
        model: "User",
        select: "username avatar fullName",});

    const hotelId = req.params.id;

    let hotel = await Hotel.findByIdAndUpdate(hotelId, {
        $push: {
            comments: comment._id
        }
    })
    hotel.save()

    hotel = await Hotel.findById(hotelId).populate({ path: "comments",
        model: "Comment"});

    const totalRating = hotel.comments.reduce((acc, cur) => acc + cur.rating, 0);
    hotel.rating = totalRating / hotel.comments.length;
    hotel.save()


    return res
        .status(200)
        .json(new ApiResponse(200, newComment, "Comment created successfully"));
})

const deleteComment = asyncHandler(async (req, res) => {
    const commentId = req.params.id;
    const hotelId = req.body.hotelId;
    const hotel = await Hotel.findById(hotelId).populate({ path: "comments",
        model: "Comment"});

    if (!hotel) {
        throw new ApiError(404, "Hotel not found");
    }
    hotel.comments = hotel.comments.filter(comment => comment._id != commentId.toString());
    if(hotel.comments.length == 0){
        hotel.rating = 0;
        hotel.save();
    } else {
     const totalRating = hotel.comments.reduce((acc, cur) => acc + cur.rating, 0);
     hotel.rating = totalRating / hotel.comments.length;
     hotel.save();
    }
    
    const comment = await Comment.findByIdAndDelete(commentId);

    return res.status(200).json(new ApiResponse(200, comment, "Comment deleted successfully"));
})

export {createComment, deleteComment}