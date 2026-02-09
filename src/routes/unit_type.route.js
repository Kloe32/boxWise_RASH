import { unitTypeController } from "../controller/unit_type.controller.js";
import express from "express";
import { requireAuth } from "../middlewares/verifyToken.js";

const router = express.Router();

router.get("/", requireAuth, unitTypeController.getUnitTypesWithAggre);

export default router;
