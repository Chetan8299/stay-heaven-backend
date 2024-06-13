import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { createHotel, fetchAllHotels, getHotelDetails } from "../controllers/hotel.controller.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

router.route("/create").post(upload.array('images', 5),verifyJWT, createHotel)
router.route("/hotels").get(fetchAllHotels) 
router.route("/:id").get(getHotelDetails)  

export default router;