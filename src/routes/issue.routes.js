import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { createIssue, getIssues } from "../controllers/issue.controller.js";


const router = Router();

router.route("/create").post(verifyJWT, createIssue);

router.route("/get").post(verifyJWT, getIssues);


export default router;
