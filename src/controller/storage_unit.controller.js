import {
  getAllStorageUnits,
  getStorageUnitById,
} from "../repositories/storage_unit.repo.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/AsyncHandler.js";

const ALLOWED_SIZES = new Set(["small", "medium", "large"]);
const ALLOWED_STATUS = new Set(["available", "locked", "occupied"]);

const listStorageUnits = asyncHandler(async (req, res) => {
  const { size_type, status } = req.query;

  if (size_type && !ALLOWED_SIZES.has(size_type)) {
    throw new ApiError(400, "Invalid size type", []);
  }

  if (status && !ALLOWED_STATUS.has(status)) {
    throw new ApiError(400, "Invalid size type", []);
  }

  const units = await getAllStorageUnits({ size_type, status });

  return res
    .status(200)
    .json(
      new ApiResponse(200, { units }, `Successfully Fetched Storage Units.`)
    );
});

const getOneStorageUnit = asyncHandler(async (req, res) => {
  const room_id = Number(req.params.id);
  if (!Number.isInteger(room_id) || room_id <= 0) {
    throw new ApiError(400, "Invalid room_id");
  }
  const unit = await getStorageUnitById(room_id);
  if (!unit) throw new ApiError(404, "Room Does not exists");

  return res
    .status(200)
    .json(new ApiResponse(200, unit, "Storage Fetched Successfully!"));
});

export { listStorageUnits, getOneStorageUnit };
