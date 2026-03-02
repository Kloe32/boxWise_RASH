import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import supertest from "supertest";

// ── Mock the storage unit service ────────────────────────────────────
const mockStorageUnitService = {
  getAllUnits: jest.fn(),
  updateUnitStatus: jest.fn(),
  getUnitById: jest.fn(),
  getAllUnitsWithTenant: jest.fn(),
};

const adminUser = {
  id: 1,
  email: "admin@test.com",
  full_name: "Admin",
  role: "ADMIN",
};

jest.unstable_mockModule("../../src/services/storageUnit.service.js", () => ({
  storageUnitService: mockStorageUnitService,
}));
jest.unstable_mockModule("../../src/middlewares/verifyToken.js", () => ({
  requireAuth: (req, _res, next) => {
    req.user = adminUser;
    next();
  },
}));

const { default: unitRouter } =
  await import("../../src/routes/storage_unit.route.js");
const { createApp } = await import("../helpers/createApp.js");

const app = createApp({ unitRouter });
const request = supertest(app);

beforeEach(() => jest.clearAllMocks());

// =====================================================================
// GET /api/v1/storage-unit/with-tenant  (admin)
// =====================================================================
describe("GET /api/v1/storage-unit/with-tenant", () => {
  it("should return 200 with units + tenants", async () => {
    mockStorageUnitService.getAllUnitsWithTenant.mockResolvedValue([
      { id: 1, unit_number: "A-01" },
    ]);

    const res = await request.get("/api/v1/storage-unit/with-tenant");
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  it("should return 404 when no units", async () => {
    const { ApiError } = await import("../../src/utils/ApiError.js");
    mockStorageUnitService.getAllUnitsWithTenant.mockRejectedValue(
      new ApiError(404, "There is no units in the database."),
    );

    const res = await request.get("/api/v1/storage-unit/with-tenant");
    expect(res.status).toBe(404);
  });
});

// =====================================================================
// PATCH /api/v1/storage-unit/:id  (update status)
// =====================================================================
describe("PATCH /api/v1/storage-unit/:id", () => {
  it("should return 200 on successful status update", async () => {
    mockStorageUnitService.updateUnitStatus.mockResolvedValue({
      id: 1,
      status: "MAINTENANCE",
    });

    const res = await request
      .patch("/api/v1/storage-unit/1")
      .send({ status: "MAINTENANCE" });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("MAINTENANCE");
    expect(res.body.message).toMatch(/updated/i);
  });

  it("should return 400 for invalid status", async () => {
    const { ApiError } = await import("../../src/utils/ApiError.js");
    mockStorageUnitService.updateUnitStatus.mockRejectedValue(
      new ApiError(400, "Invalid Status!"),
    );

    const res = await request
      .patch("/api/v1/storage-unit/1")
      .send({ status: "BROKEN" });

    expect(res.status).toBe(400);
  });

  it("should return 404 when unit not found", async () => {
    const { ApiError } = await import("../../src/utils/ApiError.js");
    mockStorageUnitService.updateUnitStatus.mockRejectedValue(
      new ApiError(404, "Unit Not Found!"),
    );

    const res = await request
      .patch("/api/v1/storage-unit/999")
      .send({ status: "AVAILABLE" });

    expect(res.status).toBe(404);
  });
});
