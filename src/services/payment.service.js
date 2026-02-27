import { paymentRepo } from "../repositories/payment.repo.js";
import { ApiError } from "../utils/ApiError.js";

const addMonths = (date, monthsToAdd) => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + monthsToAdd);
  return d;
};
const toAmount = (value) => Number(Number(value || 0).toFixed(2));

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

  async createRenewalPayment({ bookingId, startDate, receipt }, options = {}) {
    if (!bookingId) throw new ApiError(400, "Booking id is required!");
    if (!startDate) throw new ApiError(400, "Start date is required!");
    if (!receipt || Number(receipt) <= 0)
      throw new ApiError(400, "Receipt amount is invalid.");
    const initialPayment =
      Number(receipt.breakdown.initial_payment) - Number(receipt.adminFee || 0);
    const firstPayment = {
      booking_id: bookingId,
      amount: initialPayment,
      description: "Renewal Initial Payment",
      due_date: startDate,
      payment_status: "PENDING",
    };
    const recurringPayments = Array.from(
      { length: receipt.breakdown.recurring_months },
      (_, idx) => ({
        booking_id: bookingId,
        amount: receipt.breakdown.monthly_charge,
        description: `Renewal Monthly Payment - ${idx + 1}`,
        due_date: addMonths(startDate, idx + 1),
        payment_status: "PENDING",
      }),
    );
    const payments = [firstPayment, ...recurringPayments];
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
  async getEarlyReturnSettlementSummary(
    { bookingId, returnDate },
    options = {},
  ) {
    if (!bookingId) throw new ApiError(400, "Booking id is required!");
    if (!returnDate) throw new ApiError(400, "Return date is required!");

    const returnDateOnly = String(returnDate).slice(0, 10);
    const payments = await paymentRepo.findPaymentsByBookingId(
      bookingId,
      options,
    );

    const summary = {
      return_date: returnDateOnly,
      outstanding: {
        count: 0,
        total: 0,
        items: [],
      },
      future_pending_to_cancel: {
        count: 0,
        total: 0,
        items: [],
      },
      paid_beyond_return: {
        count: 0,
        total: 0,
        items: [],
      },
      has_outstanding: false,
    };

    for (const payment of payments) {
      const dueDateOnly = String(payment.due_date).slice(0, 10);
      const amount = toAmount(payment.amount);
      const item = {
        id: payment.id,
        due_date: dueDateOnly,
        amount,
        status: payment.payment_status,
        description: payment.description,
      };

      if (
        ["PENDING", "OVERDUE"].includes(payment.payment_status) &&
        dueDateOnly <= returnDateOnly
      ) {
        summary.outstanding.count += 1;
        summary.outstanding.total = toAmount(
          summary.outstanding.total + amount,
        );
        summary.outstanding.items.push(item);
      }

      if (
        payment.payment_status === "PENDING" &&
        dueDateOnly > returnDateOnly
      ) {
        summary.future_pending_to_cancel.count += 1;
        summary.future_pending_to_cancel.total = toAmount(
          summary.future_pending_to_cancel.total + amount,
        );
        summary.future_pending_to_cancel.items.push(item);
      }

      if (payment.payment_status === "PAID" && dueDateOnly > returnDateOnly) {
        summary.paid_beyond_return.count += 1;
        summary.paid_beyond_return.total = toAmount(
          summary.paid_beyond_return.total + amount,
        );
        summary.paid_beyond_return.items.push(item);
      }
    }

    summary.has_outstanding = summary.outstanding.count > 0;
    return summary;
  },
  async markPaymentAsPaid(id, options = {}) {
    return paymentRepo.updatePaymentById(
      id,
      { payment_status: "PAID" },
      options,
    );
  },
};
