import { paymentRepo } from "../repositories/payment.repo.js";
import { ApiError } from "../utils/ApiError.js";

const addMonths = (date, monthsToAdd) => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + monthsToAdd);
  return d;
};

export const paymentService = {
  async createInitialPayment(
    { bookingId, method, amount, dueDate },
    options = {},
  ) {
    if (!bookingId) throw new ApiError(400, "Booking id is required!");
    if (!method) throw new ApiError(400, "Payment method is required!");
    if (amount === undefined || amount === null)
      throw new ApiError(400, "Payment amount is required!");

    return paymentRepo.createPayment(
      {
        booking_id: bookingId,
        payment_method: method,
        amount,
        description: "Initial Payment",
        due_date: dueDate,
        payment_status: "PENDING",
      },
      options,
    );
  },

  async createRecurringPayments(
    { bookingId, startDate, recurringMonths, monthlyCharge },
    options = {},
  ) {
    if (!bookingId) throw new ApiError(400, "Booking id is required!");

    if (!startDate) throw new ApiError(400, "Start date is required!");
    const count = Number(recurringMonths ?? 0);
    if (count <= 0) return [];
    if (!monthlyCharge || Number(monthlyCharge) <= 0)
      throw new ApiError(400, "Monthly charge is invalid.");

    const payments = Array.from({ length: count }, (_, idx) => ({
      booking_id: bookingId,
      amount: monthlyCharge,
      description: `Monthly Payment - ${idx + 1}`,
      due_date: addMonths(startDate, idx + 1),
      payment_status: "PENDING",
    }));

    return paymentRepo.createPayments(payments, options);
  },
  async cancelPaymentsByBookingId(bookingId, options = {}) {
    return paymentRepo.updatePaymentByBookingId(
      bookingId,
      { payment_status: "FAILED" },
      options,
    );
  },
  async cancelPendingPaymentsAfterDate(bookingId, date, options = {}) {
    if (!bookingId) throw new ApiError(400, "Booking id is required!");
    if (!date) throw new ApiError(400, "Date is required!");
    return paymentRepo.cancelPendingPaymentsAfterDate(bookingId, date, options);
  },
  async markPaymentAsPaid(id, options = {}) {
    return paymentRepo.updatePaymentById(
      id,
      { payment_status: "PAID" },
      options,
    );
  },
};
