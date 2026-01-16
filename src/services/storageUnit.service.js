import { env } from "../config/env.js";
import { storageUnitRepo } from "../repositories/storage_unit.repo.js";
import { ApiError } from "../utils/ApiError.js";

const allow_status = ["AVAILABLE", "RESERVED", "OCCUPIED", "MAINTENANCE"];

export const storageUnitService = {
  async getAllUnits(query) {
    const filters = {};
    console.log(query);
    if (query?.type_id) filters.type_id = Number(query?.type_id);
    if (query?.is_active) filters.is_active = Number(query?.is_active);
    if (query?.status) {
      if (!allow_status.includes(query?.status))
        throw new ApiError(
          400,
          `Invalid Status!Must be one of: ${allow_status.join(", ")}`
        );
      filters.status = query.status;
    }
    const units = await storageUnitRepo.getAllUnits(filters);
    if (!units) throw new ApiError(404, "There is no units in the database.");
    return units;
  },

  async updateUnitStatus(id, status) {
    const unit = await storageUnitRepo.findUnitById(id);
    if (!unit) throw new ApiError(404, "Unit Not Found!");
    if (!status) throw new ApiError(400, "No status provided!");
    if (!allow_status.includes(status))
      throw new ApiError(
        400,
        `Invalid Status!Must be one of: ${allow_status.join(", ")}`
      );

    await storageUnitRepo.patchUnitStatus(id, { status: status });
    return storageUnitRepo.findUnitById(id);
  },
};
