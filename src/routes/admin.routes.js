import { Router } from "express";
import { verifyJWT, verifyAdmin } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/hotel-approve").post(verifyJWT,verifyAdmin, );
router.route("/hotel-remove").post(verifyJWT,verifyAdmin, );
router.route("/hotel-edit").post(verifyJWT,verifyAdmin, );
router.route("/all-payment-records").post(verifyJWT,verifyAdmin, );
router.route("/all-users").post(verifyJWT,verifyAdmin, );
router.route("/all-hotels").post(verifyJWT,verifyAdmin, );

export default router;
