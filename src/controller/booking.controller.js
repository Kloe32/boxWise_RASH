import { bookingService } from "../services/booking.service.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/AsyncHandler.js";

const createBooking = asyncHandler(async (req, res) => {
  const booking = await bookingService.createBooking(req.body, req.user);
  return res
    .status(200)
    .json(new ApiResponse(200, booking, "Successfully Booked!"));
});

const getBookingDetails = asyncHandler(async (req, res) => {
  const bookings = await bookingService.listBookings(req?.query, req.user);
  return res
    .status(200)
    .json(
      new ApiResponse(200, bookings, `${bookings.length} Fetched Successfully`),
    );
});

export const bookingsController = {
  createBooking ,
  getBookingDetails,
};
