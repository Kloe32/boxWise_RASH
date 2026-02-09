import { Router } from "express";
import { bookingsController } from "../controller/booking.controller.js";
import { requireAuth } from "../middlewares/verifyToken.js";

const router = Router();

router.post("/", requireAuth, bookingsController.createBooking);
router.get("/", requireAuth, bookingsController.getBookingDetails);
router.post("/confirm/:id", requireAuth, bookingsController.confirmBooking);
router.post("/cancel/:id", requireAuth, bookingsController.cancelBooking);
router.get("/pending-with-date", requireAuth, bookingsController.getPendingBookingsWithDate);

export default router;
