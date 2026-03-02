import { jest, describe, it, expect, beforeEach } from "@jest/globals";

// Mock env and jsonwebtoken before importing
jest.unstable_mockModule("../../src/config/env.js", () => ({
  env: { JWT_SECRET: "test-secret-key" },
}));

jest.unstable_mockModule("jsonwebtoken", () => ({
  default: {
    verify: jest.fn(),
  },
}));

const jwt = (await import("jsonwebtoken")).default;
const { requireAuth } = await import("../../src/middlewares/verifyToken.js");
const { ApiError } = await import("../../src/utils/ApiError.js");

// Helper to create mock req/res/next
function mockReqResNext(authHeader) {
  const req = {
    headers: { authorization: authHeader },
  };
  const res = {};
  const next = jest.fn();
  return { req, res, next };
}

describe("requireAuth Middleware", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should call next with ApiError 401 when no authorization header", () => {
    const { req, res, next } = mockReqResNext(undefined);
    requireAuth(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const error = next.mock.calls[0][0];
    expect(error).toBeInstanceOf(ApiError);
    expect(error.statusCode).toBe(401);
    expect(error.message).toBe("Authorization token missing");
  });

  it("should call next with ApiError 401 when token is empty", () => {
    const { req, res, next } = mockReqResNext("Bearer ");
    requireAuth(req, res, next);

    // "Bearer ".split(" ")[1] is "" which is falsy
    expect(next).toHaveBeenCalledTimes(1);
    const error = next.mock.calls[0][0];
    expect(error).toBeInstanceOf(ApiError);
    expect(error.statusCode).toBe(401);
  });

  it("should set req.user and call next() for valid token", () => {
    const payload = {
      sub: 1,
      email: "test@boxwise.com",
      full_name: "Test User",
      role: "TENANT",
    };
    jwt.verify.mockReturnValue(payload);

    const { req, res, next } = mockReqResNext("Bearer valid-token-123");
    requireAuth(req, res, next);

    expect(jwt.verify).toHaveBeenCalledWith(
      "valid-token-123",
      "test-secret-key",
    );
    expect(req.user).toEqual({
      id: 1,
      email: "test@boxwise.com",
      full_name: "Test User",
      role: "TENANT",
    });
    expect(next).toHaveBeenCalledWith(); // called with no arguments
  });

  it("should set correct fields from token payload", () => {
    jwt.verify.mockReturnValue({
      sub: 42,
      email: "admin@boxwise.com",
      full_name: "Admin User",
      role: "ADMIN",
    });

    const { req, res, next } = mockReqResNext("Bearer admin-token");
    requireAuth(req, res, next);

    expect(req.user.id).toBe(42);
    expect(req.user.role).toBe("ADMIN");
  });

  it("should call next with ApiError 401 for expired/invalid token", () => {
    jwt.verify.mockImplementation(() => {
      throw new Error("jwt expired");
    });

    const { req, res, next } = mockReqResNext("Bearer expired-token");
    requireAuth(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const error = next.mock.calls[0][0];
    expect(error).toBeInstanceOf(ApiError);
    expect(error.statusCode).toBe(401);
    expect(error.message).toBe("Invalid or expired token");
  });

  it("should call next with ApiError 401 for malformed token", () => {
    jwt.verify.mockImplementation(() => {
      throw new Error("jwt malformed");
    });

    const { req, res, next } = mockReqResNext("Bearer not.a.real.token");
    requireAuth(req, res, next);

    const error = next.mock.calls[0][0];
    expect(error).toBeInstanceOf(ApiError);
    expect(error.statusCode).toBe(401);
  });
});
