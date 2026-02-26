import { unitTypeController } from "../controller/unit_type.controller.js";
import express from "express";
import { requireAuth } from "../middlewares/verifyToken.js";

const router = express.Router();

router.get("/", requireAuth, unitTypeController.getUnitTypesWithAggre);
router.get("/client/get-type", unitTypeController.getAllTypes);
router.get("/client/stats", unitTypeController.getUnitTypePublicStats);
router.get("/receipt-preview/:id", unitTypeController.getReceiptPreview);
export default router;
