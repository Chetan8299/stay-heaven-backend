import { Router } from "express";
import { handleMessage } from "../controllers/chatbot.controller.js";

const router = Router();

router.route("/message").post(handleMessage);

export default router;