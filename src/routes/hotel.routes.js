import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  createHotel,
  editHotel,
  fetchAllHotels,
  getHotelDetails,
  myCreatedPlaces,
  myPreviousBooking,
  searchHotel,
} from "../controllers/hotel.controller.js";

const router = Router();

router.route("/create").post(verifyJWT, createHotel);
router.route("/hotels").get(fetchAllHotels);
router.route("/:id").get(getHotelDetails);
router.route("/edit/:id").put(verifyJWT, editHotel);
router.route("/my-previous-booking").post(verifyJWT, myPreviousBooking);
router.route("/my-created-places").post(verifyJWT, myCreatedPlaces);
router.route("/search").post(searchHotel)

export default router;
