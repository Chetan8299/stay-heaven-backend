import { Router } from "express";
import { handleMessage } from "../controllers/chatbot.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/message").post(verifyJWT, handleMessage);

export default router;