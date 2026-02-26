import { Router } from "express";
import { authController } from "../controller/auth.controller.js";
const router = Router();

router.post("/signup", authController.registerUser);
router.post("/login", authController.login);
router.get("/:id", authController.getUserDetail);
router.put("/:id", authController.updateUser);

export default router;
