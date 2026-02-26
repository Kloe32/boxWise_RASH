import { storageUnitController } from "../controller/storage_unit.controller.js";
import express from "express";
import { requireAuth } from "../middlewares/verifyToken.js";

const router = express.Router();

// router.get("/:id", storageUnitController.getUnitById);
router.get(
  "/with-tenant",
  requireAuth,
  storageUnitController.getAllUnitsWithTenant,
);
router.patch("/:id", storageUnitController.updateUnitStatus);
router.get

export default router;
