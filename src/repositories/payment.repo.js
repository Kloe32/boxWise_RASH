import { db } from "../db/db.js";
import { Op } from "sequelize";

export const paymentRepo = {
  createPayment(payload, options = {}) {
    return db.Payments.create(payload, options);
  },

  createPayments(payloads, options = {}) {
    return db.Payments.bulkCreate(payloads, options);
  },

  updatePaymentByBookingId(id, data, options = {}) {
    return db.Payments.update(data, { where: { booking_id: id }, ...options });
  },
  cancelPendingPaymentsAfterDate(id, date, options = {}) {
    return db.Payments.update(
      { payment_status: "FAILED" },
      {
        where: {
          booking_id: id,
          payment_status: "PENDING",
          due_date: { [Op.gt]: date },
        },
        ...options,
      },
    );
  },
  updatePaymentById(id, data, options = {}) {
    return db.Payments.update(data, { where: { id }, ...options });
  },
};
