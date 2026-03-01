import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";

export function requireAuth(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return next(new ApiError(401, "Authorization token missing"));
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    req.user = {
      id: payload.sub,
      email: payload.email,
      full_name: payload.full_name,
      role: payload.role,
    };
    return next();
  } catch (error) {
    return next(new ApiError(401, "Invalid or expired token"));
  }
}
