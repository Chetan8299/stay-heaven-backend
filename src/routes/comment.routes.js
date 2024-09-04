import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  createComment,
  deleteComment
} from "../controllers/comment.controller.js";

const router = Router();

router.route("/create/:id").post(verifyJWT, createComment);
router.route("/delete/:id").post(verifyJWT, deleteComment);

export default router;
