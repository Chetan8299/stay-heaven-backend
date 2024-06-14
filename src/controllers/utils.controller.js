import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { deleteOnCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js";

const uploadImage = asyncHandler(async (req, res) => {
  const imagePath = req.file?.path;

  if (!imagePath) {
    throw new ApiError(409, "Image file is required");
  }

  const image = await uploadOnCloudinary(imagePath);

  if (!image) {
    throw new ApiError(409, "Image is required");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, image.url, "Image uploaded"));
});

const deleteImage = asyncHandler(async (req, res) => {
  const { imageUrl } = req.body;
  await deleteOnCloudinary(imageUrl);
  return res.status(200).json(new ApiResponse(200, {}, "Image deleted"));
});

export { uploadImage, deleteImage };
