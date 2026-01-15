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

const getUserDetail = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const result = await authService.getDetail(id);
  return res
    .status(200)
    .json(new ApiResponse(200, result, "Fetched User Detail!"));
});

const updateUser = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const result = await authService.updateUser(id, req.body);
  return res
    .status(200)
    .json(new ApiResponse(200, result, "User updated successfully!"));
});

export const authController = {
  registerUser,
  login,
  getUserDetail,
  updateUser,
};
