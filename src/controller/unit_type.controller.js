import { unitTypeService } from "../services/unitType.service.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/AsyncHandler.js";

const getUnitTypesWithAggre = asyncHandler(async (req, res) => {
  const result = await unitTypeService.fetchUnitTypesWithAggre(
    req.query,
    req.user,
  );
  return res
    .status(200)
    .json(new ApiResponse(200, result, "Unit Type Successfully Fetched!"));
});

export const unitTypeController = { getUnitTypesWithAggre };
