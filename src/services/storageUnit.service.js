import { storageUnitRepo } from "../repositories/storage_unit.repo.js";
import { ApiError } from "../utils/ApiError.js";

const allow_status = ["AVAILABLE", "RESERVED", "OCCUPIED", "MAINTENANCE"];

export const storageUnitService = {
  async getAllUnits(query) {
    const filters = {};
    const order = [];
    if (query?.sort === "price_desc") order.push(["unit_price", "DESC"]);
    // default
    order.push(["type_id", "ASC"]);
    if (query?.type_id) filters.type_id = Number(query?.type_id);
    if (query?.is_active) filters.is_active = Number(query?.is_active);
    if (query?.status) {
      if (!allow_status.includes(query?.status))
        throw new ApiError(
          400,
          `Invalid Status!Must be one of: ${allow_status.join(", ")}`,
        );
      filters.status = query.status;
    }
    const units = await storageUnitRepo.getAllUnits(filters, {
      order: order,
    });
    if (!units) throw new ApiError(404, "There is no units in the database.");
    return units;
  },

  async updateUnitStatus(id, payload) {
    const update = {};
    const unit = await storageUnitRepo.findUnitById(id);
    if (!unit) throw new ApiError(404, "Unit Not Found!");
    if (!payload) throw new ApiError(400, "No data provided!");
    if (payload.is_active !== undefined) update.is_active = payload?.is_active;
    if (payload.status !== undefined) {
      if (!allow_status.includes(payload.status))
        throw new ApiError(
          400,
          `Invalid Status!Must be one of: ${allow_status.join(", ")}`,
        );
      update.status = payload?.status;
    }

    await storageUnitRepo.patchUnitStatus(id, update);
    return storageUnitRepo.findUnitById(id);
  },

  async getUnitById(unit_id) {
    const unit = await storageUnitRepo.findUnitById(unit_id);
    if (!unit) throw new ApiError(404, "No Unit Found with this id.");
    return unit;
  },

  async getAllUnitsWithTenant(query, authUser) {
    const filters = {};
    const order = [];
    if (!authUser || authUser?.role !== "ADMIN")
      throw new ApiError(401, "Unauthorized herere!");

    if (query?.sort === "price_desc") order.push(["unit_price", "DESC"]);
    order.push(["type_id", "ASC"]);

    if (query?.type_id) filters.type_id = Number(query?.type_id);
    if (query?.is_active !== undefined)
      filters.is_active = Number(query?.is_active);
    if (query?.status) {
      if (!allow_status.includes(query?.status))
        throw new ApiError(
          400,
          `Invalid Status!Must be one of: ${allow_status.join(", ")}`,
        );
      filters.status = query.status;
    }

    const units = await storageUnitRepo.getAllUnitsWithTenants(filters, {
      order,
    });
    if (!units || units.length === 0)
      throw new ApiError(404, "There is no units in the database.");
    return units;
  },
};
