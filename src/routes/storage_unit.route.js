import { storageUnitController } from "../controller/storage_unit.controller.js";
import express from "express";

const router = express.Router();

router.get("/", storageUnitController.getAllUnits);
router.patch("/:id", storageUnitController.updateUnitStatus);

export default router;
