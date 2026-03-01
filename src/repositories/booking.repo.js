import { db } from "../db/db.js";
import { Sequelize, Op } from "sequelize";

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
        {
          model: db.Users,
          as: "user",
          required: true,
          attributes: { exclude: ["password_ecrypt"] },
        },
        {
          model: db.StorageUnits,
          as: "unit",
          include: [{ model: db.UnitTypes, as: "type", required: true }],
          required: true,
        },
        {
          model: db.Payments,
          as: "payments",
          required: false,
          where: { payment_status: "PENDING" },
        },
      ],

      ...options,
    });
  },

  getEndedBookingsWithinRange({ start, end }, options = {}) {
    return db.Bookings.findAll({
      where: {
        status: "ENDED",
        // overlap: booking.start < rangeEnd AND booking.end > rangeStart
        start_date: { [Op.lt]: end },
        end_date: { [Op.gt]: start },
      },
      attributes: ["id", "unit_id", "start_date", "end_date"],
      include: [
        {
          model: db.StorageUnits,
          as: "unit", // must match init-models alias
          attributes: ["id", "type_id"],
          required: true,
        },
      ],
      ...options,
    });
  },

  findBookingsWithPaymentDue(options = {}) {
    const today = new Date();
    const targetDate = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000);
    return db.Bookings.findAll({
      where: {
        status: { [Op.in]: ["CONFIRMED", "RENEWED"] },
      },
      include: [
        {
          model: db.Payments,
          as: "payments",
          required: true,
          where: {
            payment_status: "PENDING",
            due_date: {
              [Op.gte]: today,
              [Op.lte]: targetDate,
            },
          },
        },
        {
          model: db.Users,
          as: "user",
          required: true,
          attributes: { exclude: ["password_ecrypt"] },
        },
        {
          model: db.StorageUnits,
          as: "unit",
          required: true,
        },
      ],
      ...options,
    });
  },
  findExpiredPending(cutoff, options = {}) {
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

  bulkCancel(ids, options = {}) {
    return db.Bookings.update(
      { status: "CANCELLED" },
      { where: { id: { [Op.in]: ids }, status: "PENDING" }, ...options },
    );
  },

  findBookingById(id, options = {}) {
    return db.Bookings.findByPk(id, {
      include: [
        {
          model: db.Users,
          as: "user",
          required: true,
          attributes: { exclude: ["password_ecrypt"] },
        },
        {
          model: db.StorageUnits,
          as: "unit",
          include: [{ model: db.UnitTypes, as: "type", required: true }],
          required: true,
        },
        {
          model: db.Payments,
          as: "payments",
          required: false,
          where: { payment_status: "PENDING" },
        },
      ],
      ...options,
    });
  },
  findBookingByIdBasic(id, options = {}) {
    return db.Bookings.findByPk(id, options);
  },
  findBookingByUserId(user_id, options = {}) {
    return db.Bookings.findAll({
      where: { user_id },
    });
  },

  findAllUnitsWithTenants(unit_id, options = {}) {
    const now = new Date();
    return db.Bookings.findOne({
      where: {
        unit_id,
        status: { [Op.in]: ["CONFIRMED", "RENEWED"] },
        end_date: { [Op.gte]: now },
      },
      include: [
        {
          model: db.Users,
          as: "user",
          required: true,
          attributes: { exclude: ["password_ecrypt"] },
        },
      ],
      order: [["start_date", "ASC"]],
      ...options,
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

  /**
   * Find CONFIRMED / RENEWED bookings whose end_date is exactly
   * `daysAhead` days from now, with no renewal requested and no early return.
   */
  findApproachingEndBookings(targetDate, options = {}) {
    return db.Bookings.findAll({
      where: {
        status: { [Op.in]: ["CONFIRMED", "RENEWED"] },
        end_date: targetDate,
        renewal_status: { [Op.in]: ["NONE", "REJECTED"] },
        return_date: { [Op.is]: null },
      },
      include: [
        {
          model: db.Users,
          as: "user",
          required: true,
          attributes: { exclude: ["password_ecrypt"] },
        },
        {
          model: db.StorageUnits,
          as: "unit",
          required: true,
        },
      ],
      ...options,
    });
  },

  /**
   * Bulk-update bookings to VACATING status.
   */
  bulkVacate(ids, options = {}) {
    return db.Bookings.update(
      { status: "VACATING" },
      {
        where: {
          id: { [Op.in]: ids },
          status: { [Op.in]: ["CONFIRMED", "RENEWED"] },
        },
        ...options,
      },
    );
  },
};
