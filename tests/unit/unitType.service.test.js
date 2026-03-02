import { jest, describe, it, expect, beforeEach } from "@jest/globals";

// ── Mocks ────────────────────────────────────────────────────────────
const mockUnitTypeRepo = {
  getTypesWithUnitStats: jest.fn(),
  getAllTypes: jest.fn(),
  findTypeById: jest.fn(),
};

jest.unstable_mockModule("../../src/repositories/unitType.repo.js", () => ({
  unitTypeRepo: mockUnitTypeRepo,
}));

// Mock pricing engine — returns deterministic receipt
jest.unstable_mockModule("../../src/pricing/pricing.engine.js", () => ({
  calculateFinalPrice: jest.fn((price, dur) => ({
    subtotal: price * dur,
    gst: 0,
    total: price * dur,
    adminFee: 50,
    breakdown: {
      initial_payment: price + 50,
      recurring_months: Math.max(dur - 1, 0),
      monthly_charge: price,
    },
  })),
}));

const { unitTypeService } =
  await import("../../src/services/unitType.service.js");

beforeEach(() => jest.clearAllMocks());

const fakeType = {
  id: 1,
  type_name: "Small",
  sqft: 25,
  dimensions: "5x5",
  base_price: 100,
  adjusted_price: 120,
  total_units: 10,
  occupied: 4,
  units: [
    { id: 1, status: "AVAILABLE" },
    { id: 2, status: "OCCUPIED" },
  ],
};

// =====================================================================
// fetchUnitTypesWithAggre()
// =====================================================================
describe("unitTypeService.fetchUnitTypesWithAggre", () => {
  it("should throw 401 when not admin", async () => {
    await expect(
      unitTypeService.fetchUnitTypesWithAggre({}, { role: "CUSTOMER" }),
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  it("should throw 401 when no authUser", async () => {
    await expect(
      unitTypeService.fetchUnitTypesWithAggre({}, null),
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  it("should throw 404 when no types found", async () => {
    mockUnitTypeRepo.getTypesWithUnitStats.mockResolvedValue([]);
    await expect(
      unitTypeService.fetchUnitTypesWithAggre({}, { role: "ADMIN" }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("should return types for admin", async () => {
    mockUnitTypeRepo.getTypesWithUnitStats.mockResolvedValue([fakeType]);
    const result = await unitTypeService.fetchUnitTypesWithAggre(
      {},
      { role: "ADMIN" },
    );
    expect(result).toEqual([fakeType]);
  });

  it("should apply type_id filter from query", async () => {
    mockUnitTypeRepo.getTypesWithUnitStats.mockResolvedValue([fakeType]);
    await unitTypeService.fetchUnitTypesWithAggre(
      { type_id: "2" },
      { role: "ADMIN" },
    );
    expect(mockUnitTypeRepo.getTypesWithUnitStats).toHaveBeenCalledWith(
      expect.objectContaining({ id: 2 }),
    );
  });
});

// =====================================================================
// fetchAllUnitTypes()
// =====================================================================
describe("unitTypeService.fetchAllUnitTypes", () => {
  it("should throw 404 when no types found", async () => {
    mockUnitTypeRepo.getAllTypes.mockResolvedValue([]);
    await expect(unitTypeService.fetchAllUnitTypes({})).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it("should return all types", async () => {
    mockUnitTypeRepo.getAllTypes.mockResolvedValue([fakeType]);
    const result = await unitTypeService.fetchAllUnitTypes({});
    expect(result).toHaveLength(1);
    expect(result[0].type_name).toBe("Small");
  });
});

// =====================================================================
// fetchUnitTypePublicStats()
// =====================================================================
describe("unitTypeService.fetchUnitTypePublicStats", () => {
  it("should throw 404 when no types found", async () => {
    mockUnitTypeRepo.getTypesWithUnitStats.mockResolvedValue([]);
    await expect(
      unitTypeService.fetchUnitTypePublicStats({}),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("should return mapped public stats", async () => {
    mockUnitTypeRepo.getTypesWithUnitStats.mockResolvedValue([fakeType]);
    const result = await unitTypeService.fetchUnitTypePublicStats({});

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(
      expect.objectContaining({
        id: 1,
        type_name: "Small",
        price: 120,
        total_units: 10,
      }),
    );
    // available_units should filter only AVAILABLE
    expect(result[0].available_units).toHaveLength(1);
    expect(result[0].available_units[0].status).toBe("AVAILABLE");
    // occupancy_rate = occupied / total = 4/10 = 0.4
    expect(result[0].occupancy_rate).toBeCloseTo(0.4);
  });
});

// =====================================================================
// getReceiptPreview()
// =====================================================================
describe("unitTypeService.getReceiptPreview", () => {
  it("should throw 404 when type not found", async () => {
    mockUnitTypeRepo.findTypeById.mockResolvedValue(null);
    await expect(
      unitTypeService.getReceiptPreview(999, 3),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("should throw 400 when duration is invalid", async () => {
    mockUnitTypeRepo.findTypeById.mockResolvedValue(fakeType);
    await expect(unitTypeService.getReceiptPreview(1, 0)).rejects.toMatchObject(
      { statusCode: 400 },
    );
  });

  it("should throw 400 when duration is NaN", async () => {
    mockUnitTypeRepo.findTypeById.mockResolvedValue(fakeType);
    await expect(
      unitTypeService.getReceiptPreview(1, NaN),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("should return a receipt for valid type + duration", async () => {
    mockUnitTypeRepo.findTypeById.mockResolvedValue(fakeType);
    const receipt = await unitTypeService.getReceiptPreview(1, 3);
    expect(receipt).toEqual(
      expect.objectContaining({
        subtotal: 360, // 120 * 3
        total: 360,
      }),
    );
    expect(receipt.breakdown.recurring_months).toBe(2);
  });
});
