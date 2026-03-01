import { Router } from "express";
import { bookingsController } from "../controller/booking.controller.js";
import { requireAuth } from "../middlewares/verifyToken.js";

const router = Router();

router.post("/", requireAuth, bookingsController.createBooking);
router.get("/", requireAuth, bookingsController.getBookingDetails);
router.post("/confirm/:id", requireAuth, bookingsController.confirmBooking);
router.post(
  "/request-early-return/:id",
  requireAuth,
  bookingsController.requestEarlyReturn,
);
router.post(
  "/approve-early-return/:id",
  requireAuth,
  bookingsController.approveEarlyReturnRequest,
);
router.post(
  "/confirm-booking-ending/:id",
  requireAuth,
  bookingsController.confirmBookingEnding,
);
router.post("/cancel/:id", requireAuth, bookingsController.cancelBooking);
router.get(
  "/pending-with-date",
  requireAuth,
  bookingsController.getPendingBookingsWithDate,
);
router.post(
  "/request-renewal/:id",
  requireAuth,
  bookingsController.requestBookingRenewal,
);
router.post(
  "/approve-renewal/:id",
  requireAuth,
  bookingsController.approveBookingRenewal,
);

export default router;
