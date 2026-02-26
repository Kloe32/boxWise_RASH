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

const getAllTypes = asyncHandler(async (req, res) => {
  const result = await unitTypeService.fetchAllUnitTypes(req.query);
  return res
    .status(200)
    .json(new ApiResponse(200, result, "Unit Type Successfully Fetched!"));
});

const getUnitTypePublicStats = asyncHandler(async (req, res) => {
  const result = await unitTypeService.fetchUnitTypePublicStats(req.query);
  return res
    .status(200)
    .json(new ApiResponse(200, result, "Unit Type Stats Fetched!"));
});

const getReceiptPreview = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const duration = Number(req.query.duration);
  console.log(id, duration);
  const receipt = await unitTypeService.getReceiptPreview(id, duration);
  return res
    .status(200)
    .json(new ApiResponse(200, receipt, `Receipt Preview Fetched!`));
});

export const unitTypeController = {
  getUnitTypesWithAggre,
  getAllTypes,
  getUnitTypePublicStats,
  getReceiptPreview,
};
