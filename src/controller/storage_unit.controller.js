import { storageUnitService } from "../services/storageUnit.service.js";
import { asyncHandler } from "../utils/AsyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const getAllUnits = asyncHandler(async (req, res) => {
  const units = await storageUnitService.getAllUnits(req.query);
  return res
    .status(200)
    .json(new ApiResponse(200, units, `${units.length} Unit Fetched!`));
});


const updateUnitStatus = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const result = await storageUnitService.updateUnitStatus(id, req.body);
  return res
    .status(200)
    .json(new ApiResponse(200, result, "Status Successfully Updated!"));
});
const getUnitById = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const result = await storageUnitService.getUnitById(id);
  return res
    .status(200)
    .json(new ApiResponse(200, result, "Fetched Successfully!"));
});
const getAllUnitsWithTenant = asyncHandler(async (req, res) => {
  const result = await storageUnitService.getAllUnitsWithTenant(
    req.query,
    req.user,
  );
  return res
    .status(200)
    .json(new ApiResponse(200, result, "Fetched Successfully!"));
});

export const storageUnitController = {
  getAllUnits,
  updateUnitStatus,
  getUnitById,
  getAllUnitsWithTenant,
};
