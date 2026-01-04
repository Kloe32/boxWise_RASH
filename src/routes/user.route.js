import { Router } from "express";
import {
  registerUser,
  getAllUser,
  updateUser,
  createNewUser,
} from "../controller/user.controller.js";
const router = Router();

router.post("/register", createNewUser);
router.get("/all-user", getAllUser);
router.put("/update-user/:id", updateUser);

export default router;
