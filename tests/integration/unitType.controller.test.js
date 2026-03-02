import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import supertest from "supertest";

// ── Mock the unit type service ───────────────────────────────────────
const mockUnitTypeService = {
  fetchUnitTypesWithAggre: jest.fn(),
  fetchAllUnitTypes: jest.fn(),
  fetchUnitTypePublicStats: jest.fn(),
  getReceiptPreview: jest.fn(),
};

const adminUser = {
  id: 1,
  email: "admin@test.com",
  full_name: "Admin",
  role: "ADMIN",
};

jest.unstable_mockModule("../../src/services/unitType.service.js", () => ({
  unitTypeService: mockUnitTypeService,
}));
jest.unstable_mockModule("../../src/middlewares/verifyToken.js", () => ({
  requireAuth: (req, _res, next) => {
    req.user = adminUser;
    next();
  },
}));

const { default: typeRouter } =
  await import("../../src/routes/unit_type.route.js");
const { createApp } = await import("../helpers/createApp.js");

const app = createApp({ typeRouter });
const request = supertest(app);

beforeEach(() => jest.clearAllMocks());

// =====================================================================
// GET /api/v1/unit-type  (admin — aggregated)
// =====================================================================
describe("GET /api/v1/unit-type", () => {
  it("should return 200 with unit types", async () => {
    mockUnitTypeService.fetchUnitTypesWithAggre.mockResolvedValue([
      { id: 1, type_name: "Small" },
    ]);

    const res = await request.get("/api/v1/unit-type");
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  it("should return 404 when no types", async () => {
    const { ApiError } = await import("../../src/utils/ApiError.js");
    mockUnitTypeService.fetchUnitTypesWithAggre.mockRejectedValue(
      new ApiError(404, "No unit types found."),
    );

    const res = await request.get("/api/v1/unit-type");
    expect(res.status).toBe(404);
  });
});

// =====================================================================
// GET /api/v1/unit-type/client/get-type  (public)
// =====================================================================
describe("GET /api/v1/unit-type/client/get-type", () => {
  it("should return 200 with all types", async () => {
    mockUnitTypeService.fetchAllUnitTypes.mockResolvedValue([
      { id: 1, type_name: "Small" },
    ]);

    const res = await request.get("/api/v1/unit-type/client/get-type");
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });
});

// =====================================================================
// GET /api/v1/unit-type/client/stats  (public)
// =====================================================================
describe("GET /api/v1/unit-type/client/stats", () => {
  it("should return 200 with public stats", async () => {
    mockUnitTypeService.fetchUnitTypePublicStats.mockResolvedValue([
      { id: 1, type_name: "Small", available_units: [] },
    ]);

    const res = await request.get("/api/v1/unit-type/client/stats");
    expect(res.status).toBe(200);
  });
});

// =====================================================================
// GET /api/v1/unit-type/receipt-preview/:id
// =====================================================================
describe("GET /api/v1/unit-type/receipt-preview/:id", () => {
  it("should return 200 with receipt preview", async () => {
    mockUnitTypeService.getReceiptPreview.mockResolvedValue({
      total: 350,
      breakdown: { initial_payment: 150, recurring_months: 2 },
    });

    const res = await request.get(
      "/api/v1/unit-type/receipt-preview/1?duration=3",
    );
    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(350);
  });

  it("should return 400 when duration invalid", async () => {
    const { ApiError } = await import("../../src/utils/ApiError.js");
    mockUnitTypeService.getReceiptPreview.mockRejectedValue(
      new ApiError(400, "Invalid duration!"),
    );

    const res = await request.get(
      "/api/v1/unit-type/receipt-preview/1?duration=0",
    );
    expect(res.status).toBe(400);
  });
});
