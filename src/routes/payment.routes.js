import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { checkout, getkey, paymentverification } from '../controllers/payment.controller.js';

const router = Router();

router.route("/checkout/:id").post(verifyJWT, checkout);
router.route("/paymentverification/:id").post(verifyJWT, paymentverification);
router.route("/getkey/:id").post(verifyJWT, getkey);

export default router;