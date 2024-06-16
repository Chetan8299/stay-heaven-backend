import { Router } from "express";
import { verifyJWT, verifyAdmin } from "../middlewares/auth.middleware.js";
import {
  approveHotel,
  getAllHotels,
  removeHotel,
  getAllUsers,
  makeAdmin,
  makeAdmin,
  banUser,
} from "../controllers/admin.controller.js";

const router = Router();

router.route("/all-hotels").post(verifyJWT, verifyAdmin, getAllHotels);
router.route("/hotel-approval").post(verifyJWT, verifyAdmin, approveHotel);
router.route("/hotel-remove").post(verifyJWT, verifyAdmin, removeHotel);
router.route("/all-payment-records").post(verifyJWT, verifyAdmin);
router.route("/all-users").post(verifyJWT, verifyAdmin, getAllUsers);
router.route("/make-admin").post(verifyJWT, verifyAdmin, makeAdmin);
router.route("/remove-admin").post(verifyJWT, verifyAdmin, removeAdmin);
router.route("/ban-user").post(verifyJWT, verifyAdmin, banUser);

export default router;
