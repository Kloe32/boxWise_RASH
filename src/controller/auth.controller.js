import { authService } from "../services/auth.service.js";
import { asyncHandler } from "../utils/AsyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body);
  return res
    .status(200)
    .json(new ApiResponse(200, result, "Successfully Registered!"));
});

const login = asyncHandler(async (req, res) => {
  const { email, phone, password } = req.body;
  const result = await authService.login(email, password, phone);
  return res
    .status(200)
    .json(new ApiResponse(200, result, "Successfully logged in!"));
});

export const authController = {
  registerUser,
  login,
};
