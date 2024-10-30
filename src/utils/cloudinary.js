import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config({ path:"../../.env" });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const checkIfResourceExists = async (publicId) => {
  try {
    const resource = await cloudinary.api.resource(publicId);

    return {
      exists: true,
      resource
    };
  } catch (error) {
    if (error.http_code === 404) {
      return { exists: false, message: 'Resource not found' };
    }

    return { exists: false, message: 'An error occurred', error };
  }
};

const extractPublicIdFromUrl = (url) => {
  const parts = url.split('/');
  const versionIndex = parts.findIndex((part) => part.startsWith('v'));
  const publicIdWithExtension = parts.slice(versionIndex + 1).join('/');
  const publicId = publicIdWithExtension.substring(0, publicIdWithExtension.lastIndexOf('.'));
  return publicId;
};

export const deleteFileFromCloudinary = async (fileUrl, resourceType = 'image') => {
  try {
    const publicId = extractPublicIdFromUrl(fileUrl);

    const resourceExists = await checkIfResourceExists(publicId);

    if (resourceExists.exists) {
      const result = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    } else {
      console.error(resourceExists.message);
    }
  } catch (error) {
    console.error('Error deleting file from Cloudinary:', error);
  }
};
