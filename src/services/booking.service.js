import { sequelize } from "../db/sequelize.js";
import { calculateFinalPrice } from "../pricing/pricing.engine.js";
import { bookingRepo } from "../repositories/booking.repo.js";
import { paymentService } from "../services/payment.service.js";
import { storageUnitRepo } from "../repositories/storage_unit.repo.js";
import { ApiError } from "../utils/ApiError.js";
import { endDate, generateBookingId } from "../utils/helper.js";
import { Op } from "sequelize";
import { ca, se } from "date-fns/locale";
import { unitTypeService } from "./unitType.service.js";
import { unitTypeRepo } from "../repositories/unitType.repo.js";
import {
  bookingConfirmedMailgenContent,
  bookingCreatedInfoMailgenContent,
  bookingCancelledMailgenContent,
  sendEmail,
  earlyMoveOutApprovalMailgenContent,
  bookingEndedMailgenContent,
  renewalRequestedMailgenContent,
  renewalApprovedMailgenContent,
} from "../utils/mail.js";

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
      // send email notification about the booking creation and pending payment

      try {
        const emailContent = bookingCreatedInfoMailgenContent({
          customerName: authUser.full_name,
          bookingId: booking.id,
          unitLabel: unit.unit_number,
          startDate: start.toISOString().slice(0, 10),
          endDate: end.toISOString().slice(0, 10),
          receipt,
          duration,
          initialPaymentDueDate: dueDate.toISOString().slice(0, 10),
          officeAddress:
            "BoxWise Self-Storage (Main Office) - Bukit Batok Street 10, Singapore 621212",
          officeBankAccount: "DBS Bank - BoxWise Bank Account - 012-345-6789",
          keyCollectionInstructions:
            "After payment, you can collect your access card and keys from our main office during business hours on the move-in date. Please bring a copy of this email and a valid ID for verification. If you have any questions, feel free to contact us at support@boxwise.asia",
        });
        await sendEmail({
          email: authUser.email,
          subject: "Unit Booked! Please Complete Your Payment",
          mailgenContent: emailContent,
        });
      } catch (err) {
        console.error(
          `⚠️ Failed to send booking-created email for ${booking.id}:`,
          err.message,
        );
      }

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
          method: booking.payments[0].payment_method,
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
      const emailContent = bookingConfirmedMailgenContent({
        customerName: updated.user.full_name,
        bookingId: updated.id,
        unitLabel: updated.unit.unit_number,
        startDate: start.toISOString().slice(0, 10),
        endDate: end.toISOString().slice(0, 10),
      });
      try {
        await sendEmail({
          email: updated.user.email,
          subject: "Booking Confirmed! Welcome to BoxWise",
          mailgenContent: emailContent,
        });
      } catch (err) {
        console.error(
          `⚠️ Failed to send booking-confirmed email for ${updated.id}:`,
          err.message,
        );
      }
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
  async cancelBooking(booking_id, authUser) {
    if (!authUser) throw new ApiError(401, "Unauthorized");

    if (!booking_id) throw new ApiError(402, "Id is required!");
    return sequelize.transaction(async (t) => {
      const booking = await bookingRepo.findBookingById(booking_id, {
        transaction: t,
      });
      if (!booking) throw new ApiError(404, "Booking Not Found!");

      await bookingRepo.updateBookingById(
        booking.id,
        { status: "CANCELLED" },
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
      const emailContent = bookingCancelledMailgenContent({
        customerName: booking.user.full_name,
        bookingId: booking.id,
        unitLabel: booking.unit.unit_number,
      });
      try {
        await sendEmail({
          email: booking.user.email,
          subject: "Booking Cancelled - BoxWise",
          mailgenContent: emailContent,
        });
      } catch (err) {
        console.error(
          `⚠️ Failed to send booking-cancelled email for ${booking.id}:`,
          err.message,
        );
      }

      return await bookingRepo.findBookingById(booking.id, {
        transaction: t,
      });
    });
  },
  async getPendingBookingsWithDate(authUser) {
    if (!authUser || authUser?.role !== "ADMIN")
      throw new ApiError(401, "Unauthorized");
    const now = new Date();
    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      0,
      0,
      0,
      0,
    );
    const endOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59,
      999,
    );

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
    console.log("HEYyyyyyyyyy--------------------");
    const yesterdayStart = new Date(startOfDay.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayEnd = new Date(endOfDay.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayPending = (
      await bookingRepo.findAllBooking({
        status: "PENDING",
        created_at: {
          [Op.gte]: yesterdayStart,
          [Op.lte]: yesterdayEnd,
        },
      })
    ).length;
    return { totalPending, todayPending, yesterdayPending };
  },
  async requestEarlyReturn(booking_id, requestedDate, authUser) {
    if (!authUser) throw new ApiError(401, "Unauthorized");

    if (!booking_id) throw new ApiError(402, "Id is required!");
    if (!requestedDate) throw new ApiError(400, "requestedDate is required!");

    const booking = await bookingRepo.findBookingById(booking_id);
    if (!booking) throw new ApiError(404, "Booking Not Found!");

    if (booking.user_id !== authUser.id)
      throw new ApiError(
        403,
        "You can only request early return for your own bookings.",
      );

    if (!["CONFIRMED", "RENEWED"].includes(booking.status)) {
      throw new ApiError(
        409,
        "Early return can only be requested for active bookings.",
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
    if (requestedDate < startDateOnly || requestedDate > endDateOnly) {
      throw new ApiError(
        400,
        `requestedDate must be between ${startDateOnly} and ${endDateOnly}.`,
      );
    }

    await bookingRepo.updateBookingById(booking_id, {
      return_date: requestedDate,
    });
    return bookingRepo.findBookingById(booking_id);
  },
  async confirmBookingEnding(booking_id, authUser) {
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

      if (booking.status !== "VACATING") {
        throw new ApiError(
          409,
          "Only bookings with status 'VACATING' can be confirmed as ended.",
        );
      }

      // Use return_date if set (early return), otherwise use today's date
      const effectiveReturnDate =
        booking.return_date || new Date().toISOString().slice(0, 10);

      await bookingRepo.updateBookingById(
        booking.id,
        {
          status: "ENDED",
          is_vacated: true,
          return_date: effectiveReturnDate,
          end_date: effectiveReturnDate,
        },
        { transaction: t },
      );

      await paymentService.cancelPendingPaymentsAfterDate(
        booking.id,
        effectiveReturnDate,
        { transaction: t },
      );
      await storageUnitRepo.patchUnitStatus(
        booking.unit_id,
        {
          status: "AVAILABLE",
        },
        { transaction: t },
      );

      // Fetch full booking with user + unit for the email
      const fullBooking = await bookingRepo.findBookingById(booking.id, {
        transaction: t,
      });

      const emailContent = bookingEndedMailgenContent({
        customerName: fullBooking?.user?.full_name,
        unitLabel: fullBooking?.unit?.unit_number,
        endDate: effectiveReturnDate,
      });

      try {
        await sendEmail({
          email: fullBooking?.user?.email,
          subject: "Booking Ended - BoxWise",
          mailgenContent: emailContent,
        });
      } catch (err) {
        console.error(
          `⚠️ Failed to send booking-ended email for ${booking.id}:`,
          err.message,
        );
      }

      return bookingRepo.findBookingByIdBasic(booking.id, { transaction: t });
    });
  },
  async approveEarlyReturnRequest(booking_id, authUser) {
    if (!authUser || authUser?.role !== "ADMIN")
      throw new ApiError(401, "Unauthorized");

    if (!booking_id) throw new ApiError(402, "Id is required!");

    const booking = await bookingRepo.findBookingById(booking_id);
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

    const return_date = booking.return_date || null;
    if (!return_date) {
      throw new ApiError(400, "No return date found to approve.");
    }
    const approvedDateOnly = new Date(return_date);

    // Check for outstanding payments due BEFORE the return date
    const outstandingPayments = booking.payments.filter(
      (p) => new Date(p.due_date) <= approvedDateOnly,
    );
    if (outstandingPayments.length > 0) {
      throw new ApiError(
        409,
        `There ${outstandingPayments.length === 1 ? "is" : "are"} ${outstandingPayments.length} outstanding payment(s) due before the return date. Please settle them before approving.`,
      );
    }

    // Wrap status update + payment cancellation in a transaction
    return sequelize.transaction(async (t) => {
      // Flag booking as VACATING
      await bookingRepo.updateBookingById(
        booking_id,
        { status: "VACATING" },
        { transaction: t },
      );

      // Cancel any PENDING payments due AFTER the return date
      await paymentService.cancelPendingPaymentsAfterDate(
        booking_id,
        return_date,
        { transaction: t },
      );

      const emailContent = earlyMoveOutApprovalMailgenContent({
        customerName: booking.user.full_name,
        unitLabel: booking.unit.unit_number,
        approvedReturnDate: approvedDateOnly,
        endDate: booking.end_date,
      });
      try {
        await sendEmail({
          email: booking.user.email,
          subject: "Early Move-Out Approved - BoxWise",
          mailgenContent: emailContent,
        });
      } catch (err) {
        console.error(
          `⚠️ Failed to send early-move-out email for ${booking_id}:`,
          err.message,
        );
      }

      return { approved: true };
    });
  },
  async requestRenewal(booking_id, duration, authUser) {
    if (!authUser) throw new ApiError(401, "Unauthorized");

    if (!booking_id) throw new ApiError(402, "Id is required!");

    const booking = await bookingRepo.findBookingById(booking_id);
    if (!booking) throw new ApiError(404, "Booking Not Found!");

    if (booking.user_id !== authUser.id)
      throw new ApiError(
        403,
        "You can only request renewal for your own bookings.",
      );

    if (booking.status !== "CONFIRMED") {
      throw new ApiError(
        409,
        "Only Active bookings can be requested for renewal.",
      );
    }
    if (booking.renewal_status === "REQUESTED") {
      throw new ApiError(
        409,
        "Renewal has already been requested for this booking.",
      );
    }
    if (booking.is_vacated) {
      throw new ApiError(409, "Cannot renew a vacated booking.");
    }

    const requestedEndDate = endDate(booking.end_date, duration);
    if (isNaN(requestedEndDate.getTime())) {
      throw new ApiError(400, "Invalid end date calculated from duration.");
    }

    const result = await bookingRepo.updateBookingById(
      booking_id,
      {
        renewal_status: "REQUESTED",
        renewal_requested_date: requestedEndDate,
      },
      { returning: true },
    );

    if (!result || result.length === 0) {
      throw new ApiError(500, "Failed to update booking for renewal.");
    }

    try {
      const emailContent = renewalRequestedMailgenContent({
        customerName: booking.user.full_name,
        bookingId: booking.id,
        unitLabel: booking.unit.unit_number,
        currentEndDate: new Date(booking.end_date),
        requestedEndDate,
      });
      await sendEmail({
        email: booking.user.email,
        subject: `Renewal Requested for Unit ${booking.unit.unit_number} - BoxWise`,
        mailgenContent: emailContent,
      });
    } catch (err) {
      console.error(
        `⚠️ Failed to send renewal-requested email for ${booking.id}:`,
        err.message,
      );
    }

    return result[1][0];
  },
  async approveRenewal(booking_id, authUser) {
    if (!authUser || authUser?.role !== "ADMIN")
      throw new ApiError(401, "Unauthorized");

    if (!booking_id) throw new ApiError(402, "Id is required!");

    const booking = await bookingRepo.findBookingById(booking_id);
    if (!booking) throw new ApiError(404, "Booking Not Found!");

    if (booking.renewal_status !== "REQUESTED") {
      throw new ApiError(
        409,
        "Only bookings with renewal requested can be approved.",
      );
    }

    const updatedEndDate = booking.renewal_requested_date;
    if (!updatedEndDate || isNaN(new Date(updatedEndDate).getTime())) {
      throw new ApiError(400, "Invalid renewal end date.");
    }
    const start = new Date(booking.end_date);
    const end = new Date(updatedEndDate);
    const durationMonth =
      end.getMonth() -
      start.getMonth() +
      12 * (end.getFullYear() - start.getFullYear());
    return await sequelize.transaction(async (t) => {
      const unitType = await unitTypeRepo.findTypeById(booking.unit.type_id, {
        transaction: t,
      });
      const unitPrice = Number(unitType?.adjusted_price ?? 0);
      const receipt = calculateFinalPrice(unitPrice, durationMonth);
      const paymentStartDate = new Date(booking.end_date);
      paymentStartDate.setMonth(paymentStartDate.getMonth() + 1);
      const newPayments = await paymentService.createRenewalPayment(
        { bookingId: booking_id, startDate: paymentStartDate, receipt },
        { transaction: t },
      );
      await bookingRepo.updateBookingById(
        booking_id,
        {
          status: "RENEWED",
          end_date: updatedEndDate,
          renewal_status: "APPROVED",
        },
        { returning: true, transaction: t },
      );

      try {
        const emailContent = renewalApprovedMailgenContent({
          customerName: booking.user.full_name,
          bookingId: booking.id,
          unitLabel: booking.unit.unit_number,
          newEndDate: new Date(updatedEndDate),
          payments: newPayments,
        });
        await sendEmail({
          email: booking.user.email,
          subject: `Renewal Approved for Unit ${booking.unit.unit_number} - BoxWise`,
          mailgenContent: emailContent,
        });
      } catch (err) {
        console.error(
          `⚠️ Failed to send renewal-approved email for ${booking.id}:`,
          err.message,
        );
      }

      return { renewed: true, newPayments };
    });
  },
};
