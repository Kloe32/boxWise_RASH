import { env } from "../config/env.js";
import { storageUnitRepo } from "../repositories/storage_unit.repo.js";
import { ApiError } from "../utils/ApiError.js";

export const storageUnitService = {
  async getAllUnits() {
    const units = await storageUnitRepo.getAllUnits();
    if (!units) throw new ApiError(404, "There is no units in the database.");
    return units;
  },
};
