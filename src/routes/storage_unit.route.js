import {
  listStorageUnits,
  getOneStorageUnit,
} from "../controller/storage_unit.controller.js";
import express from "express";

const router = express.Router();

router.get("/", listStorageUnits);
router.get("/:id", getOneStorageUnit);

export default router;
