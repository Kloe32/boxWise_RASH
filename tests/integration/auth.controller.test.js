import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import supertest from "supertest";

// ── Mock the auth service ────────────────────────────────────────────
const mockAuthService = {
  register: jest.fn(),
  login: jest.fn(),
  getDetail: jest.fn(),
  updateUser: jest.fn(),
};

jest.unstable_mockModule("../../src/services/auth.service.js", () => ({
  authService: mockAuthService,
}));

// ── Import AFTER mocking ────────────────────────────────────────────
const { default: authRouter } = await import("../../src/routes/auth.route.js");
const { createApp } = await import("../helpers/createApp.js");

const app = createApp({ authRouter });
const request = supertest(app);

beforeEach(() => jest.clearAllMocks());

// =====================================================================
// POST /api/v1/user/signup
// =====================================================================
describe("POST /api/v1/user/signup", () => {
  it("should return 200 with token on successful registration", async () => {
    mockAuthService.register.mockResolvedValue({
      token: "jwt-token",
      user: { id: 1, email: "a@b.com" },
    });

    const res = await request.post("/api/v1/user/signup").send({
      name: "Test",
      email: "a@b.com",
      phone: "123",
      password: "pass1234",
    });

    expect(res.status).toBe(200);
    expect(res.body.data.token).toBe("jwt-token");
    expect(res.body.message).toMatch(/registered/i);
  });

  it("should return error status when service throws ApiError", async () => {
    const { ApiError } = await import("../../src/utils/ApiError.js");
    mockAuthService.register.mockRejectedValue(
      new ApiError(400, "Email, phone and password are required!"),
    );

    const res = await request.post("/api/v1/user/signup").send({});

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/required/i);
  });
});

// =====================================================================
// POST /api/v1/user/login
// =====================================================================
describe("POST /api/v1/user/login", () => {
  it("should return 200 with token on successful login", async () => {
    mockAuthService.login.mockResolvedValue({
      token: "login-jwt",
      user: { id: 1, email: "a@b.com" },
    });

    const res = await request
      .post("/api/v1/user/login")
      .send({ email: "a@b.com", password: "pass1234" });

    expect(res.status).toBe(200);
    expect(res.body.data.token).toBe("login-jwt");
  });

  it("should return 404 when user does not exist", async () => {
    const { ApiError } = await import("../../src/utils/ApiError.js");
    mockAuthService.login.mockRejectedValue(
      new ApiError(404, "User does not exists"),
    );

    const res = await request
      .post("/api/v1/user/login")
      .send({ email: "no@user.com", password: "pass1234" });

    expect(res.status).toBe(404);
  });
});

// =====================================================================
// GET /api/v1/user/:id
// =====================================================================
describe("GET /api/v1/user/:id", () => {
  it("should return 200 with user detail", async () => {
    mockAuthService.getDetail.mockResolvedValue({
      id: 1,
      full_name: "Test",
      email: "a@b.com",
    });

    const res = await request.get("/api/v1/user/1");
    expect(res.status).toBe(200);
    expect(res.body.data.full_name).toBe("Test");
  });

  it("should return 404 when user not found", async () => {
    const { ApiError } = await import("../../src/utils/ApiError.js");
    mockAuthService.getDetail.mockRejectedValue(
      new ApiError(404, "User Not Found!"),
    );

    const res = await request.get("/api/v1/user/999");
    expect(res.status).toBe(404);
  });
});

// =====================================================================
// PUT /api/v1/user/:id
// =====================================================================
describe("PUT /api/v1/user/:id", () => {
  it("should return 200 on successful update", async () => {
    mockAuthService.updateUser.mockResolvedValue({
      id: 1,
      full_name: "Updated",
    });

    const res = await request
      .put("/api/v1/user/1")
      .send({ full_name: "Updated" });

    expect(res.status).toBe(200);
    expect(res.body.data.full_name).toBe("Updated");
  });

  it("should return 400 for invalid role", async () => {
    const { ApiError } = await import("../../src/utils/ApiError.js");
    mockAuthService.updateUser.mockRejectedValue(
      new ApiError(400, "Invalid Role!"),
    );

    const res = await request
      .put("/api/v1/user/1")
      .send({ role: "SUPERADMIN" });

    expect(res.status).toBe(400);
  });
});
