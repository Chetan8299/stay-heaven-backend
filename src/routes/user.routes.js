import { Router } from "express";
import {
  changeCurrentPassword,
  forgotPassword,
  getCurrentUser,
  loginUser,
  logoutUser,
  registerUser,
  resetPassword,
  updateAccountDetails,
  updateUserAvatar,
  approveOrder,
  getOrders,
  getSellerDashBoardData,
  getSellerData,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(registerUser);
router.route("/login").post(loginUser);
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/change-password").post(verifyJWT, changeCurrentPassword);
router.route("/current-user").get(verifyJWT, getCurrentUser);
router.route("/update-account-details").post(verifyJWT, updateAccountDetails);
router.route("/forgot-password").post(forgotPassword);
router.route("/reset-password/:id/:token").post(resetPassword);
router.route("/get-orders").post(verifyJWT, getOrders); 
router.route("/approve-order").post(verifyJWT, approveOrder); 
router.route("/get-seller-dashboard-data").post(verifyJWT, getSellerDashBoardData);
router.route("/get-seller-data").post(verifyJWT, getSellerData);

router
  .route("/avatar")
  .patch(verifyJWT,  updateUserAvatar);
export default router;
