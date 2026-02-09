import { db } from "../db/db.js";
import { Sequelize, Op } from "sequelize";

export const seasonalPricingRepo = {
  async upsertSeasonalPricing(data, option = {}) {
    return db.SeasonalPricing.upsert(data, option);
  },

  async getMultiplierById(type_id, month, option = {}) {
    return db.SeasonalPricing.findOne({
      where: {
        type_id,
        month_index: month,
      },
      ...option,
    });
  },
};
