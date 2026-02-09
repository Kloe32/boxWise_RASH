import { db } from "../db/db.js";

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
  updatePaymentById(id, data, options = {}) {
    return db.Payments.update(data, { where: { id }, ...options });
  },
};
