import { Op } from "sequelize";
import { db } from "../db/db.js";

export const unitTypeRepo = {
  async getAllTypes(filter = {}, option = {}) {
    return db.UnitTypes.findAll({
      where: filter,
      ...option,
    });
  },
  async getTypesWithUnitStats(filter = {}, option = {}) {
    const now = new Date();
    const types = await db.UnitTypes.findAll({
      where: filter,
      include: [
        {
          model: db.StorageUnits,
          as: "storage_units",
          required: false,
          include: [
            {
              model: db.Bookings,
              as: "bookings",
              required: false,
              where: {
                status: { [Op.in]: ["CONFIRMED", "RENEWED", "PENDING"] },
                end_date: { [Op.gte]: now },
              },
              include: [
                {
                  model: db.Users,
                  as: "user",
                  required: false,
                  attributes: {
                    exclude: ["password_ecrypt", "createdAt", "updatedAt"],
                  },
                },
              ],
              order: [["start_date", "ASC"]],
            },
          ],
        },
      ],
      ...option,
    });

    return types.map((type) => {
      const units = (type.storage_units || []).map((unit) => {
        const currentBooking = unit.bookings?.[0] || null;
        return {
          id: unit.id,
          unit_number: unit.unit_number,
          type_id: unit.type_id,
          status: unit.status,
          unit_price: unit.unit_price,
          current_tenant: currentBooking?.user || null,
        };
      });

      const counts = units.reduce(
        (acc, unit) => {
          acc.total_units += 1;
          if (unit.status === "AVAILABLE") acc.available += 1;
          if (unit.status === "OCCUPIED") acc.occupied += 1;
          if (unit.status === "RESERVED") acc.reserved += 1;
          if (unit.status === "MAINTENANCE") acc.maintenance += 1;
          return acc;
        },
        {
          total_units: 0,
          available: 0,
          occupied: 0,
          reserved: 0,
          maintenance: 0,
        },
      );

      return {
        id: type.id,
        type_name: type.type_name,
        sqft: type.sqft,
        dimensions: type.dimensions,
        base_price: type.base_price,
        ...counts,
        units,
      };
    });
  },
};
