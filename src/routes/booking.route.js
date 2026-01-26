import { Router } from "express";
import { bookingsController } from "../controller/booking.controller.js";
import { requireAuth } from "../middlewares/verifyToken.js";

const bookingRouter = Router();

bookingRouter.post("/", requireAuth, bookingsController.createBooking);
bookingRouter.get("/",requireAuth,bookingsController.getBookingDetails)

export default bookingRouter;
