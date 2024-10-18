import { Router } from "express";
import { verifyJWT, verifyAdmin } from "../middlewares/auth.middleware.js";
import {
  approveHotel,
  getAllHotels,
  removeHotel,
  getAllUsers,
  makeAdmin,
  banUser,
  allOrders,
  removeAdmin,
  removeCreator,
  makeCreator,
  unbanUser,
  getAllPendingHotels,
  getAdminDashboardData,
  rejectSeller
} from "../controllers/admin.controller.js";

const router = Router();

router.route("/all-hotels").post(verifyJWT, verifyAdmin, getAllHotels);
router.route("/all-pending-hotels").post(verifyJWT, verifyAdmin, getAllPendingHotels);
router.route("/hotel-approval").post(verifyJWT, verifyAdmin, approveHotel);
router.route("/hotel-remove").post(verifyJWT, verifyAdmin, removeHotel);
router.route("/all-orders").post(verifyJWT, verifyAdmin, allOrders);
router.route("/all-users").post(verifyJWT, verifyAdmin, getAllUsers);
router.route("/make-admin").post(verifyJWT, verifyAdmin, makeAdmin);
router.route("/remove-admin").post(verifyJWT, verifyAdmin, removeAdmin);
router.route("/make-creator").post(verifyJWT, verifyAdmin, makeCreator);
router.route("/remove-creator").post(verifyJWT, verifyAdmin, removeCreator);
router.route("/ban-user").post(verifyJWT, verifyAdmin, banUser);
router.route("/unban-user").post(verifyJWT, verifyAdmin, unbanUser);
router.route("/admin-dashboard").post(verifyJWT, verifyAdmin, getAdminDashboardData);
router.route("/reject-seller").post(verifyJWT, verifyAdmin, rejectSeller);

export default router;
