import { unitTypeRepo } from "../repositories/unitType.repo.js";
import { ApiError } from "../utils/ApiError.js";
import { calculateFinalPrice } from "../pricing/pricing.engine.js";
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
  async fetchAllUnitTypes(filter) {
    const result = await unitTypeRepo.getAllTypes(filter);
    if (!result || result.length === 0)
      throw new ApiError(404, "No unit types found.");
    return result;
  },

  async fetchUnitTypePublicStats(query) {
    const filter = {};
    if (query?.type_id) filter.id = Number(query.type_id);
    if (query?.type_name) filter.type_name = query.type_name;
    if (query?.sqft) filter.sqft = query.sqft;

    const result = await unitTypeRepo.getTypesWithUnitStats(filter);
    if (!result || result.length === 0)
      throw new ApiError(404, "No unit types found.");

    return result.map((type) => ({
      id: type.id,
      type_name: type.type_name,
      sqft: type.sqft,
      dimensions: type.dimensions,
      price: type.adjusted_price,
      total_units: type.total_units,
      available_units: type.units.filter((u) => u.status === "AVAILABLE"),
      occupancy_rate:
        type.total_units > 0 ? type.occupied / type.total_units : 0,
    }));
  },

  async getReceiptPreview(type_id, duration) {
    const type = await unitTypeRepo.findTypeById(type_id);
    if (!type) throw new ApiError(404, "No Unit Found with this id.");
    if (!duration || isNaN(duration) || duration <= 0)
      throw new ApiError(400, "Invalid duration!");
    const receipt = calculateFinalPrice(type.adjusted_price, duration);
    return receipt;
  },
};
