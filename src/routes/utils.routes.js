import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import { deleteImage, uploadImage } from "../controllers/utils.controller.js";

const router = Router();

router.route("/upload-image").post(upload.single("image"), uploadImage);
router.route("/delete-image").put(deleteImage)

export default router;