import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { checkout, getkey, paymentverification } from '../controllers/payment.controller.js';

const router = Router();

router.route("/checkout").post(verifyJWT, checkout);
router.route("/paymentverification").post(verifyJWT, paymentverification);
router.route("/getkey").get(verifyJWT, getkey);

export default router;