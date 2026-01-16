import { db } from "../db/db.js";

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

  patchUnitStatus(id, status, option = {}) {
    return db.StorageUnits.update(status, {
      where: { id },
      ...option,
    });
  },
};
