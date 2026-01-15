import { storageUnitService } from "../services/storageUnit.service.js";
import { asyncHandler } from "../utils/AsyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const getAllUnits = asyncHandler(async (req, res) => {
  const units = await storageUnitService.getAllUnits();
  return res
    .status(200)
    .json(new ApiResponse(200, units, `${units.length} Unit Fetched!`));
});

export const storageUnitController = {
  getAllUnits,
};
