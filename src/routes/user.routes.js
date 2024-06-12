import { Router } from "express";
import { loginUser, registerUser } from "../controllers/user.controller";
import { upload } from "../middlewares/multer.middleware";

const router = Router();

router.route("/register").post(upload.single("avatar"),registerUser)
router.route("/login").post(loginUser)

export default router