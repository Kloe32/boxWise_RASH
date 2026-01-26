import { db } from "../db/db.js";
import { Op } from "sequelize";

export const bookingRepo = {
  createBooking(data, options = {}) {
    return db.Bookings.create(data, options);
  },
  updateBookingById(id, data, options = {}) {
    return db.Bookings.update(data, { where: { id }, ...options });
  },
  findAllBooking(filters = {}, options = {}) {
    return db.Bookings.findAll({
      where: filters,
      order: [["id", "DESC"]],
      include: [
        { model: db.Users, as: "user", required: true },
        {
          model: db.StorageUnits,
          as: "unit",
          include: [{ model: db.UnitTypes, as: "type", required: true }],
          required: true,
        },
      ],

      ...options,
    });
  },
  findExpiredPending(cutoff, options) {
    return db.Bookings.findAll({
      where: {
        status: "PENDING",
        created_at: { [Op.lt]: cutoff },
      },
      include: [
        {
          model: db.StorageUnits,
          as: "unit",
          required: true,
        },
      ],
      ...options,
      lock: options.transaction?.LOCK?.UPDATE,
    });
  },

  bulkCancel(ids, options) {
    return db.Bookings.update(
      { status: "CANCELLED" },
      { where: { id: { [Op.in]: ids }, status: "PENDING" }, ...options },
    );
  },

  findBookingById(id, options = {}) {
    return db.Bookings.findByPk(id, {
      include: [
        { model: db.Users, as: "user", required: true },
        {
          model: db.StorageUnits,
          as: "unit",
          include: [{ model: db.UnitTypes, as: "type", required: true }],
          required: true,
        },
      ],
      ...options,
    });
  },
  findBookingByUserId(user_id) {
    return db.Bookings.findAll({
      where: { user_id },
    });
  },

  findUnitForUpdate(id, options = {}) {
    return db.StorageUnits.findByPk(id, {
      ...options,
      lock: options.transaction?.LOCK?.UPDATE,
    });
  },

  findOverlappingBookings({ unit_id, start_date, end_date }, options = {}) {
    return db.Bookings.findAll({
      where: {
        unit_id,
        status: { [Op.in]: ["PENDING", "CONFIRMED"] },
        start_date: { [Op.lt]: end_date },
        end_date: { [Op.gt]: start_date },
      },
      ...options,
    });
  },
};
