import { sequelize } from "../db/sequelize.js";
import { bookingRepo } from "../repositories/booking.repo.js";
import { ApiError } from "../utils/ApiError.js";
import { endDate, generateBookingId } from "../utils/helper.js";

export const bookingService = {
  async createBooking(payload, authUser) {
    const { unit_id, start_date, duration } = payload;

    if (!authUser?.id) throw new ApiError(401, "Unauthorized!");
    if (!unit_id || !start_date || !duration)
      throw new ApiError(
        400,
        "Credentials: unit_id, start_date and duration are not provided!",
      );
    const start = new Date(start_date);
    const end = endDate(start_date, duration);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new ApiError(400, "Invalid Start Date.");
    }

    return sequelize.transaction(async (t) => {
      // lock the unit until the end of this transaction so others cannot book this at the same time.
      const unit = await bookingRepo.findUnitForUpdate(Number(unit_id), {
        transaction: t,
      });
      if (!unit) throw new ApiError(404, "Storage Unit Not Found!");

      // check overlap
      const overlaps = await bookingRepo.findOverlappingBookings(
        {
          unit_id: Number(unit_id),
          start_date: start,
          end_date: end,
        },
        { transaction: t },
      );

      if (overlaps.length > 0) {
        throw new ApiError(409, "This unit is already booked");
      }

      await unit.update({ status: "RESERVED" }, { transaction: t });

      //!!!!!here comes the dynamic pricing section -- still under development
      const final_price = 999.99;

      //booking creation
      const id = generateBookingId(unit_id);
      const booking = await bookingRepo.createBooking(
        {
          id: id,
          final_price: final_price,
          user_id: authUser.id,
          unit_id: Number(unit_id),
          start_date: start,
          end_date: end,
          status: "PENDING",
        },
        { transaction: t },
      );

      return booking;
    });
  },
  async listBookings(query, authUser) {
    if (!authUser) throw new ApiError(401, "Unauthorized");

    const filters = {};
    //filter by user
    if (authUser?.role !== "ADMIN") filters.user_id = authUser.id;
    //filter by status
    if (query?.status) filters.status = query.status;
    //filter by unit_id
    if (query?.unit_id) filters.storage_unit_id = Number(query.unit_id);

    return bookingRepo.findAllBooking(filters);
  },
};
