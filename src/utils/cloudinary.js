import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: `${process.env.CLOUDINARY_CLOUD_NAME}`,
  api_key: `${process.env.CLOUDINARY_API_KEY}`,
  api_secret: `${process.env.CLOUDINARY_API_SECRET}`,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;
    // upload the file on cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
    // file has been uploaded successfully
    // console.log("file is uploaded on cloudinary", response.url)
    // fs.unlinkSync(localFilePath)
    return response;
  } catch (error) {
    // fs.unlinkSync(localFilePath) // remove the locally saved temporary file as the upload operation failed
    return null;
  }
};

const deleteOnCloudinary = async (url) => {
  try {
    const publicId = extractPublicId(url);
    console.log("publicId", publicId);

    await cloudinary.uploader.destroy(publicId, function (error, result) {
      if (error) {
        console.error("Error deleting image:", error);
      } else {
        console.log("Image deleted successfully:", result);
      }
    });
  } catch (error) {
    return null;
  }
};

function extractPublicId(url) {
  const urlParts = url.split("/");
  const publicIdWithExtension = urlParts.pop();
  const publicId = publicIdWithExtension.split(".")[0];
  return publicId;
}

export { uploadOnCloudinary, deleteOnCloudinary };
