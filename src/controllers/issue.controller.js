import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Issue } from "../models/issue.model.js";


const createIssue = asyncHandler(async (req, res) => {
    const id = req.user?._id;

    if (!id) {
        throw new ApiError(401, "Unauthorized request");
    }

    const { category, description, images } = req.body;

    if (!category || !description || !images) {
        throw new ApiError(400, "All fields are required");
    }

    const issue = await Issue.create({
        user: id,
        category,
        description,
        images
    });

    return res
        .status(200)
        .json(new ApiResponse(200, issue, "Issue created successfully"));
})

const getIssues = asyncHandler(async (req, res) => {
    const id = req.user?._id;

    if (!id) {
        throw new ApiError(401, "Unauthorized request");
    }

    const issues = await Issue.find({ user: id });

    return res
        .status(200)
        .json(new ApiResponse(200, issues, "Issues fetched successfully"));
})

export {createIssue, getIssues}