import { db } from "../db/db.js";
import { Op } from "sequelize";

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

  getAllUnits(filter = {}) {
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
    });
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
