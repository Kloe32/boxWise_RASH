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

const confirmBooking = asyncHandler(async (req, res) => {
  const id = req.params.id;
  const result = await bookingService.confirmBooking(id, req.user);
  return res.status(200).json(new ApiResponse(200, result, `Confirmed!`));
});

const cancelBooking = asyncHandler(async (req, res) => {
  const id = req.params.id;
  const result = await bookingService.cancelBooking(id, req.user);
  return res.status(200).json(new ApiResponse(200, result, `Status Updated!`));
});

const requestEarlyReturn = asyncHandler(async (req, res) => {
  const id = req.params.id;
  const { requested_date } = req.body;
  console.log(requested_date);
  const result = await bookingService.requestEarlyReturn(
    id,
    requested_date,
    req.user,
  );
  return res
    .status(200)
    .json(new ApiResponse(200, result, `Early return requested successfully!`));
});

const confirmBookingEnding = asyncHandler(async (req, res) => {
  const id = req.params.id;
  const result = await bookingService.confirmBookingEnding(id, req.user);
  return res
    .status(200)
    .json(new ApiResponse(200, result, `Early return confirmed!`));
});

const approveEarlyReturnRequest = asyncHandler(async (req, res) => {
  const id = req.params.id;
  const result = await bookingService.approveEarlyReturnRequest(id, req.user);
  return res
    .status(200)
    .json(new ApiResponse(200, result, `Early return approved!`));
});

const getPendingBookingsWithDate = asyncHandler(async (req, res) => {

  const bookings = await bookingService.getPendingBookingsWithDate(req.user);
  return res
    .status(200)
    .json(
      new ApiResponse(200, bookings, `${bookings.length} Fetched Successfully`),
    );
});

const requestBookingRenewal = asyncHandler(async (req, res) => {
  const id = req.params.id;
  const { additional_duration } = req.body;
  const result = await bookingService.requestRenewal(
    id,
    parseInt(additional_duration, 10),
    req.user,
  );
  return res
    .status(200)
    .json(new ApiResponse(200, result, `Renewal requested successfully!`));
});

const approveBookingRenewal = asyncHandler(async (req, res) => {
  const id = req.params.id;
  const result = await bookingService.approveRenewal(id, req.user);
  return res
    .status(200)
    .json(new ApiResponse(200, result, `Renewal approved successfully!`));
});

export const bookingsController = {
  createBooking,
  getBookingDetails,
  confirmBooking,
  cancelBooking,
  requestEarlyReturn,
  approveEarlyReturnRequest,
  getPendingBookingsWithDate,
  requestBookingRenewal,
  approveBookingRenewal,
  confirmBookingEnding,
};
