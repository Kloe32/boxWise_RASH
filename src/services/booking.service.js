import { sequelize } from "../db/sequelize.js";
import { calculateFinalPrice } from "../pricing/pricing.engine.js";
import { bookingRepo } from "../repositories/booking.repo.js";
import { paymentService } from "../services/payment.service.js";
import { storageUnitRepo } from "../repositories/storage_unit.repo.js";
import { ApiError } from "../utils/ApiError.js";
import { endDate, generateBookingId } from "../utils/helper.js";
import { Op } from "sequelize";

const availableStatuses = [
  "PENDING",
  "CONFIRMED",
  "CANCELLED",
  "ENDED",
  "RENEWED",
];
export const bookingService = {
  async createBooking(payload, authUser) {
    const { unit_id, start_date, duration, method } = payload;

    if (!authUser?.id) throw new ApiError(401, "Unauthorized!");
    if (!unit_id || !start_date || !duration)
      throw new ApiError(
        400,
        "Credentials: unit_id, start_date and duration are not provided!",
      );
    if (!method) throw new ApiError(400, "Payment method is required!");
    const start = new Date(start_date);
    const end = endDate(start_date, duration);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new ApiError(400, "Invalid Start Date.");
    }

    return sequelize.transaction(async (t) => {
      // lock the unit until the end of this transaction so others cannot book this at the same time.
      const unit = await storageUnitRepo.findUnitForUpdate(Number(unit_id), {
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
      // dynamic pricing section
      const unit_price = Number(
        unit?.type?.adjusted_price ?? unit?.type?.base_price ?? 0,
      );
      if (!unit_price || unit_price <= 0) {
        throw new ApiError(400, "Unit price is not set.");
      }
      const receipt = calculateFinalPrice(unit_price, duration);

      const initialPayment = receipt?.breakdown?.initial_payment ?? 0;
      if (!initialPayment || initialPayment <= 0) {
        throw new ApiError(400, "Invalid payment amount.");
      }

      //booking creation
      const id = generateBookingId(unit_id);
      const booking = await bookingRepo.createBooking(
        {
          id: id,
          final_price: receipt?.total,
          user_id: authUser.id,
          unit_id: Number(unit_id),
          start_date: start,
          end_date: end,
          status: "PENDING",
        },
        { transaction: t },
      );
      await unit.update({ status: "RESERVED" }, { transaction: t });
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 5);

      await paymentService.createInitialPayment(
        {
          bookingId: id,
          method,
          amount: initialPayment,
          dueDate,
        },
        { transaction: t },
      );

      return { booking, receipt };
    });
  },

  async confirmBooking(bookingId, authUser) {
    if (!authUser || authUser?.role !== "ADMIN")
      throw new ApiError(401, "Unauthorized");

    if (!bookingId) throw new ApiError(400, "bookingId is required!");
    return sequelize.transaction(async (t) => {
      const booking = await bookingRepo.findBookingById(bookingId, {
        transaction: t,
      });
      if (!booking) throw new ApiError(404, "Booking Not Found!");

      if (booking.status === "CANCELLED")
        throw new ApiError(400, "Booking expired/cancelled.");

      const now = new Date();
      const depositDeadline = new Date(booking.created_at);
      depositDeadline.setDate(depositDeadline.getDate() + 5);

      if (now > depositDeadline) {
        throw new ApiError(400, "Deposit window expired.");
      }
      const init_payment_id = booking.payments[0].id;

      await paymentService.markPaymentAsPaid(init_payment_id, {
        transaction: t,
      });

      const start = new Date(booking.start_date);
      const end = new Date(booking.end_date);
      const monthsDiff =
        (end.getFullYear() - start.getFullYear()) * 12 +
        (end.getMonth() - start.getMonth());
      const durationMonths = Math.max(monthsDiff, 0);

      const unitPrice = Number(booking.unit?.type?.adjusted_price ?? 0);
      const receipt = calculateFinalPrice(unitPrice, durationMonths);

      const recurringMonths = receipt?.breakdown?.recurring_months ?? 0;
      if (recurringMonths === 0) return { booking, receipt, created: 0 };

      await paymentService.createRecurringPayments(
        {
          bookingId: booking.id,
          startDate: start,
          recurringMonths,
          monthlyCharge: receipt?.breakdown?.monthly_charge ?? 0,
        },
        { transaction: t },
      );

      await bookingRepo.updateBookingById(
        booking.id,
        { status: "CONFIRMED" },
        { transaction: t },
      );
      await storageUnitRepo.patchUnitStatus(
        booking?.unit_id,
        {
          status: "OCCUPIED",
        },
        { transaction: t },
      );
      const updated = await bookingRepo.findBookingById(booking.id, {
        transaction: t,
      });
      return { updated, receipt, created: recurringMonths };
    });
  },
  async listBookings(query, authUser) {
    if (!authUser) throw new ApiError(401, "Unauthorized");

    const filters = {};
    //filter by user
    if (authUser?.role !== "ADMIN") filters.user_id = authUser.id;
    //filter by status
    if (query?.status) {
      if (!availableStatuses.includes(query.status))
        throw new ApiError(
          400,
          `Invalid Status! Must be one of: ${availableStatuses.join(", ")}`,
        );
      filters.status = query.status;
    }
    if (query?.year) {
      const startOfYear = new Date(Number(query.year), 0, 1);
      const endOfYear = new Date(Number(query.year), 11, 31, 23, 59, 59, 999);
      filters.created_at = {
        [Op.gte]: startOfYear,
        [Op.lte]: endOfYear,
      };
    }
    //filter by unit_id
    if (query?.unit_id) filters.unit_id = Number(query.unit_id);

    //filter by booking id
    if (query?.id) filters.id = query.id;

    return bookingRepo.findAllBooking(filters);
  },
  async cancelBooking(booking_id, status, authUser) {
    if (!authUser) throw new ApiError(401, "Unauthorized");

    if (!booking_id) throw new ApiError(402, "Id is required!");
    if (!status) throw new ApiError(402, "Status is required!");
    sequelize.transaction(async (t) => {
      const booking = await bookingRepo.findBookingById(booking_id, {
        transaction: t,
      });
      if (!booking) throw new ApiError(404, "Booking Not Found!");

      await bookingRepo.updateBookingById(
        booking.id,
        { status: status },
        { transaction: t },
      );
      await storageUnitRepo.patchUnitStatus(
        booking?.unit_id,
        {
          status: "AVAILABLE",
        },
        { transaction: t },
      );
      await paymentService.cancelPaymentsByBookingId(booking.id, {
        transaction: t,
      });
      return await bookingRepo.findBookingById(booking.id, {
        transaction: t,
      });
    });
  },
  async getPendingBookingsWithDate(authUser) {
    if (!authUser || authUser?.role !== "ADMIN")
      throw new ApiError(401, "Unauthorized");
    const d = new Date();
    const startOfDay = new Date(d.setHours(0, 0, 0, 0));
    const endOfDay = new Date(d.setHours(23, 59, 59, 999));

    const totalPending = await bookingRepo.findAllBooking({
      status: "PENDING",
    });

    const todayPending = (
      await bookingRepo.findAllBooking({
        status: "PENDING",
        created_at: {
          [Op.gte]: startOfDay,
          [Op.lte]: endOfDay,
        },
      })
    ).length;

    const yesterdayPending = (
      await bookingRepo.findAllBooking({
        status: "PENDING",
        created_at: {
          [Op.gte]: new Date(startOfDay.getTime() - 24 * 60 * 60 * 1000),
          [Op.lte]: new Date(endOfDay.getTime() - 24 * 60 * 60 * 1000),
        },
      })
    ).length;
    return { totalPending, todayPending, yesterdayPending };
  },
  async requestEarlyVacate(booking_id, requestedDate, authUser) {
    if (!authUser) throw new ApiError(401, "Unauthorized");

    if (!booking_id) throw new ApiError(402, "Id is required!");
    if (!requestedDate) throw new ApiError(400, "requestedDate is required!");

    const requestedDateOnly = String(requestedDate);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(requestedDateOnly)) {
      throw new ApiError(400, "requestedDate must be in YYYY-MM-DD format.");
    }

    const booking = await bookingRepo.findBookingById(booking_id);
    if (!booking) throw new ApiError(404, "Booking Not Found!");

    if (booking.user_id !== authUser.id)
      throw new ApiError(
        403,
        "You can only request early vacate for your own bookings.",
      );

    if (!["CONFIRMED", "RENEWED"].includes(booking.status)) {
      throw new ApiError(
        409,
        "Early vacate can only be requested for active bookings.",
      );
    }

    if (booking.is_vacated) {
      throw new ApiError(409, "Booking is already vacated.");
    }

    if (booking.return_date) {
      throw new ApiError(409, "Early vacate has already been requested.");
    }

    const startDateOnly = String(booking.start_date).slice(0, 10);
    const endDateOnly = String(booking.end_date).slice(0, 10);
    if (requestedDateOnly < startDateOnly || requestedDateOnly > endDateOnly) {
      throw new ApiError(
        400,
        `requestedDate must be between ${startDateOnly} and ${endDateOnly}.`,
      );
    }

    await bookingRepo.updateBookingById(booking_id, {
      return_date: requestedDateOnly,
    });
    return bookingRepo.findBookingByIdBasic(booking_id);
  },
  async confirmEarlyReturn(booking_id, authUser) {
    if (!authUser || authUser?.role !== "ADMIN")
      throw new ApiError(401, "Unauthorized");

    if (!booking_id) throw new ApiError(402, "Id is required!");

    return sequelize.transaction(async (t) => {
      const booking = await bookingRepo.findBookingByIdBasic(booking_id, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (!booking) throw new ApiError(404, "Booking Not Found!");

      if (booking.status === "ENDED") {
        throw new ApiError(409, "Booking is already ended.");
      }

      if (!["CONFIRMED", "RENEWED"].includes(booking.status)) {
        throw new ApiError(
          409,
          "Only active bookings can be confirmed as early returned.",
        );
      }

      const confirmedDateOnly = booking.return_date
        ? String(booking.return_date).slice(0, 10)
        : null;

      if (!confirmedDateOnly) {
        throw new ApiError(400, "No return date found to confirm.");
      }

      if (!/^\d{4}-\d{2}-\d{2}$/.test(confirmedDateOnly)) {
        throw new ApiError(400, "Return date must be in YYYY-MM-DD format.");
      }

      const startDateOnly = String(booking.start_date).slice(0, 10);
      const endDateOnly = String(booking.end_date).slice(0, 10);
      const todayDateOnly = new Date().toISOString().slice(0, 10);
      if (confirmedDateOnly < startDateOnly || confirmedDateOnly > endDateOnly) {
        throw new ApiError(
          400,
          `Return date must be between ${startDateOnly} and ${endDateOnly}.`,
        );
      }
      if (confirmedDateOnly > todayDateOnly) {
        throw new ApiError(400, "Return date cannot be in the future.");
      }

      await bookingRepo.updateBookingById(
        booking.id,
        {
          status: "ENDED",
          is_vacated: true,
          return_date: confirmedDateOnly,
          end_date: confirmedDateOnly,
        },
        { transaction: t },
      );

      await paymentService.cancelPendingPaymentsAfterDate(
        booking.id,
        confirmedDateOnly,
        { transaction: t },
      );

      await storageUnitRepo.patchUnitStatus(
        booking.unit_id,
        {
          status: "AVAILABLE",
        },
        { transaction: t },
      );

      return bookingRepo.findBookingByIdBasic(booking.id, { transaction: t });
    });
  },
  async approveEarlyReturnRequest(booking_id, authUser) {
    if (!authUser || authUser?.role !== "ADMIN")
      throw new ApiError(401, "Unauthorized");

    if (!booking_id) throw new ApiError(402, "Id is required!");

    return sequelize.transaction(async (t) => {
      const booking = await bookingRepo.findBookingByIdBasic(booking_id, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (!booking) throw new ApiError(404, "Booking Not Found!");

      if (!["CONFIRMED", "RENEWED"].includes(booking.status)) {
        throw new ApiError(
          409,
          "Only active bookings can have early return approval.",
        );
      }

      if (booking.is_vacated || booking.status === "ENDED") {
        throw new ApiError(409, "Booking is already vacated.");
      }

      const approvedDateOnly = booking.return_date
        ? String(booking.return_date).slice(0, 10)
        : null;

      if (!approvedDateOnly) {
        throw new ApiError(400, "No requested return date found to approve.");
      }

      if (!/^\d{4}-\d{2}-\d{2}$/.test(approvedDateOnly)) {
        throw new ApiError(400, "Return date must be in YYYY-MM-DD format.");
      }

      const startDateOnly = String(booking.start_date).slice(0, 10);
      const endDateOnly = String(booking.end_date).slice(0, 10);
      if (approvedDateOnly < startDateOnly || approvedDateOnly > endDateOnly) {
        throw new ApiError(
          400,
          `Return date must be between ${startDateOnly} and ${endDateOnly}.`,
        );
      }

      await bookingRepo.updateBookingById(
        booking.id,
        { return_date: approvedDateOnly },
        { transaction: t },
      );

      const updated = await bookingRepo.findBookingByIdBasic(booking.id, {
        transaction: t,
      });
      return { approved: true, booking: updated };
    });
  },
};
