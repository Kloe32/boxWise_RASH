import { unitTypeRepo } from "../repositories/unitType.repo.js";
import { ApiError } from "../utils/ApiError.js";

export const unitTypeService = {
  async fetchUnitTypesWithAggre(query, authUser) {
    if (!authUser || authUser.role !== "ADMIN")
      throw new ApiError(401, "Unauthorized");
    const filter = {};
    if (query?.type_id) filter.id = Number(query.type_id);
    if (query?.type_name) filter.type_name = query.type_name;
    if (query?.sqft) filter.sqft = query.sqft;

    const result = await unitTypeRepo.getTypesWithUnitStats(filter);
    if (!result || result.length === 0)
      throw new ApiError(404, "No unit types found.");
    return result;
  },
};
