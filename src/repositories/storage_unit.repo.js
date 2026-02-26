import { db } from "../db/db.js";
import { Sequelize, Op } from "sequelize";

export const storageUnitRepo = {
  findUnitById(id) {
    return db.StorageUnits.findByPk(id, {
      include: [
        {
          model: db.UnitTypes,
          as: "type",
          required: true,
        },
      ],
    });
  },

  findUnitForUpdate(id, options = {}) {
    return db.StorageUnits.findByPk(id, {
      include: [
        {
          model: db.UnitTypes,
          as: "type",
          required: true,
        },
      ],
      ...options,
      lock: options.transaction?.LOCK?.UPDATE,
    });
  },

  getAllUnits(filter = {}, option = {}) {
    return db.StorageUnits.findAll({
      where: filter,
      include: [
        {
          model: db.UnitTypes,
          as: "type",
          required: true,
        },
      ],
      order: [["id", "ASC"]],
      ...option,
    });
  },

  getAllUnitsWithTenants(filter = {}, options = {}) {
    const now = new Date();
    return db.StorageUnits.findAll({
      where: filter,
      include: [
        {
          model: db.UnitTypes,
          as: "type",
          required: true,
        },
        {
          model: db.Bookings,
          as: "bookings",
          required: false,
          where: {
            status: { [Op.in]: ["CONFIRMED", "RENEWED", "PENDING"] },
            end_date: { [Op.gte]: now },
          },
          include: [
            { model: db.Users, as: "user", required: false },
            {
              model: db.Payments,
              as: "payments",
              where: { payment_status: "PENDING" },
              required: false,
            },
          ],
        },
      ],
      order: [["id", "ASC"]],
      ...options,
    });
  },

  async getUnitCountsByType(options = {}) {
    const rows = await db.StorageUnits.findAll({
      attributes: [
        "type_id",
        [Sequelize.fn("COUNT", Sequelize.col("id")), "unit_count"],
      ],
      group: ["type_id"],
      ...options,
    });
    const map = new Map();
    for (const r of rows)
      map.set(Number(r.type_id), Number(r.get("unit_count")));
    return map;
  },
  async getCurrentOccupiedCountsByType(options = {}) {
    const rows = await db.StorageUnits.findAll({
      attributes: [
        "type_id",
        [Sequelize.fn("COUNT", Sequelize.col("id")), "occ_count"],
      ],
      where: { status: { [Op.in]: ["OCCUPIED", "RESERVED"] } },
      group: ["type_id"],
      ...options,
    });

    const map = new Map();
    for (const r of rows)
      map.set(Number(r.type_id), Number(r.get("occ_count")));
    return map;
  },

  patchUnitStatus(id, payload, option = {}) {
    return db.StorageUnits.update(payload, {
      where: { id },
      ...option,
    });
  },

  releaseExpiredUnits(unitIds, option = {}) {
    return db.StorageUnits.update(
      { status: "AVAILABLE" },
      {
        where: {
          id: { [Op.in]: unitIds },
          status: "RESERVED",
        },
        ...option,
      },
    );
  },
};
