import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { env } from "../config/env.js";
import { security } from "../utils/encryptDecrypt.js";
import { authRepo } from "../repositories/auth.repo.js";
import { ApiError } from "../utils/ApiError.js";

function signToken(payload) {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRY || "1d",
  });
}

export const authService = {
  async register(payload) {
    const { name, email, password, phone, role } = payload;

    if (!email || !phone || !password)
      throw new ApiError(400, "Email, phone and password are required!");
    if (name.trim() === "") throw new ApiError(400, "No name provided!");
    if (password.length < 8)
      throw new ApiError(400, "Password must be at least 8 characters!");

    const existingUser = await authRepo.findUserByEmailOrPhone({
      email,
      phone,
    });
    if (existingUser) throw new ApiError(409, "Already registered!");

    const password_ecrypt = security.encryption(password);

    const user = await authRepo.createUser({
      full_name: name || null,
      email: email,
      phone: phone,
      password_ecrypt: password_ecrypt,
      role: role,
    });
    if (!user) throw new ApiError(500, "Internal Server Error");
    const token = signToken({ sub: user?.id, role: user?.role });

    return {
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    };
  },

  async login(email = null, password, phone = null) {
    if (!email && !phone)
      throw new ApiError(
        400,
        "Email or phone are not provided are not provided",
      );
    if (!password) throw new ApiError(400, "Password Not Privided!");

    const user = await authRepo.findUserByEmailOrPhone({ email, phone });
    if (!user)
      throw new ApiError(
        404,
        "User does not exists with the provided credential!",
      );

    const ok = security.comparison(password, user.password_ecrypt);
    if (!ok) throw new ApiError(401, "Wrong Password!");

    const token = signToken({ sub: user.id, role: user.role });
    return {
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        phone: user.phone,
        address: user.address,
        role: user.role,
      },
    };
  },

  async getDetail(id) {
    const detail = await authRepo.findUserById(id);
    if (!detail) throw new ApiError(404, "User Not Found!");
    return detail;
  },

  async updateUser(id, payload) {
    const user = await authRepo.findUserById(id);
    if (!user) throw new ApiError(404, "User does not exist!");

    const updates = {};

    if (payload.full_name !== undefined) updates.full_name = payload.full_name;
    if (payload.phone !== undefined) updates.phone = payload.phone;
    if (payload.address !== undefined) updates.address = payload.address;
    if (payload.role !== undefined) {
      if (!["ADMIN", "CUSTOMER"].includes(payload.role))
        throw new ApiError(400, "Invalid Role!");
      updates.role = payload.role;
    }

    if (Object.keys(updates).length === 0) {
      throw new ApiError(400, "NO valid field to update.");
    }
    await authRepo.updateUserById(id, updates);
    return authRepo.findUserById(id);
  },
};
