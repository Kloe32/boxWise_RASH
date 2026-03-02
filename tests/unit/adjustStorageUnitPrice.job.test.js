import { jest, describe, it, expect, beforeEach } from "@jest/globals";

// ── Mocks ────────────────────────────────────────────────────────────
const mockUnitTypeRepo = {
  getAllTypes: jest.fn(),
  updateTypeById: jest.fn(),
};

const mockStorageUnitRepo = {
  getUnitCountsByType: jest.fn(),
  getCurrentOccupiedCountsByType: jest.fn(),
};

const mockSeasonalPricingRepo = {
  getMultiplierById: jest.fn(),
};

const fakeTransaction = { LOCK: { UPDATE: "UPDATE" } };
const mockSequelize = {
  transaction: jest.fn((cb) => cb(fakeTransaction)),
};

jest.unstable_mockModule("../../src/db/sequelize.js", () => ({
  sequelize: mockSequelize,
}));
jest.unstable_mockModule("../../src/repositories/unitType.repo.js", () => ({
  unitTypeRepo: mockUnitTypeRepo,
}));
jest.unstable_mockModule(
  "../../src/repositories/storage_unit.repo.js",
  () => ({
    storageUnitRepo: mockStorageUnitRepo,
  }),
);
jest.unstable_mockModule(
  "../../src/repositories/seasonalPricing.repo.js",
  () => ({
    seasonalPricingRepo: mockSeasonalPricingRepo,
  }),
);

// Mock the pricing engine — use the real formula: base * seasonal * supply
jest.unstable_mockModule("../../src/pricing/pricing.engine.js", () => ({
  calculateUnitPrice: jest.fn(({ basePrice, seasonalMultiplier, supplyMultiplier }) =>
    Number((basePrice * seasonalMultiplier * supplyMultiplier).toFixed(2)),
  ),
}));

// The real supplyMultiplier from helper is pure, but we mock the module
// so the job's import resolves correctly. We replicate the real logic:
jest.unstable_mockModule("../../src/utils/helper.js", () => ({
  supplyMultiplier: jest.fn((rate) => {
    if (rate >= 0.5) return { label: "TIGHT", multiplier: 1.05 };
    if (rate >= 0.4) return { label: "NORMAL", multiplier: 1.0 };
    return { label: "LOW", multiplier: 0.9 };
  }),
}));

const { adjustStorageUnitPrice } = await import(
  "../../src/jobs/definitions/adjustStorageUnitPrice.job.js"
);

beforeEach(() => jest.clearAllMocks());

// ── Helpers ──────────────────────────────────────────────────────────
const fakeTypes = [
  { id: 1, base_price: 100, adjusted_price: 100 },
  { id: 2, base_price: 200, adjusted_price: 200 },
];

function setupRepos({ unitTypes, unitCountMap, occupiedCountMap, seasonalMultiplier }) {
  mockUnitTypeRepo.getAllTypes.mockResolvedValue(unitTypes);
  mockStorageUnitRepo.getUnitCountsByType.mockResolvedValue(unitCountMap);
  mockStorageUnitRepo.getCurrentOccupiedCountsByType.mockResolvedValue(occupiedCountMap);
  mockSeasonalPricingRepo.getMultiplierById.mockResolvedValue(
    seasonalMultiplier != null ? { multiplier: seasonalMultiplier } : null,
  );
  mockUnitTypeRepo.updateTypeById.mockResolvedValue([1]);
}

// =====================================================================
describe("adjustStorageUnitPrice job", () => {
  it("should return { updatedTypes: 0 } when no types exist", async () => {
    setupRepos({
      unitTypes: [],
      unitCountMap: new Map(),
      occupiedCountMap: new Map(),
      seasonalMultiplier: 1,
    });

    const result = await adjustStorageUnitPrice();

    expect(result.updatedTypes).toBe(0);
    expect(mockUnitTypeRepo.updateTypeById).not.toHaveBeenCalled();
  });

  it("should skip update when calculated price equals current price", async () => {
    // base=100, seasonal=1.0, supply=1.0 (rate 0.4 → NORMAL) → price=100
    // adjusted_price is already 100 → skip
    setupRepos({
      unitTypes: [{ id: 1, base_price: 100, adjusted_price: 100 }],
      unitCountMap: new Map([[1, 10]]),
      occupiedCountMap: new Map([[1, 4]]), // 4/10 = 0.4 → NORMAL(1.0)
      seasonalMultiplier: 1.0,
    });

    const result = await adjustStorageUnitPrice();

    expect(result.updatedTypes).toBe(0);
    expect(mockUnitTypeRepo.updateTypeById).not.toHaveBeenCalled();
  });

  it("should update price when seasonal multiplier changes it", async () => {
    // base=100, seasonal=1.25, supply=1.0 (rate 0.4 → NORMAL) → price=125
    // adjusted_price is 100 → needs update
    setupRepos({
      unitTypes: [{ id: 1, base_price: 100, adjusted_price: 100 }],
      unitCountMap: new Map([[1, 10]]),
      occupiedCountMap: new Map([[1, 4]]), // NORMAL(1.0)
      seasonalMultiplier: 1.25,
    });

    const result = await adjustStorageUnitPrice();

    expect(result.updatedTypes).toBe(1);
    expect(mockUnitTypeRepo.updateTypeById).toHaveBeenCalledWith(
      1,
      { adjusted_price: 125 },
      expect.objectContaining({ transaction: fakeTransaction }),
    );
  });

  it("should update price when high occupancy triggers TIGHT supply", async () => {
    // base=100, seasonal=1.0, supply=1.05 (rate 0.6 → TIGHT) → price=105
    // adjusted_price is 100 → needs update
    setupRepos({
      unitTypes: [{ id: 1, base_price: 100, adjusted_price: 100 }],
      unitCountMap: new Map([[1, 10]]),
      occupiedCountMap: new Map([[1, 6]]), // 6/10 = 0.6 → TIGHT(1.05)
      seasonalMultiplier: 1.0,
    });

    const result = await adjustStorageUnitPrice();

    expect(result.updatedTypes).toBe(1);
    expect(mockUnitTypeRepo.updateTypeById).toHaveBeenCalledWith(
      1,
      { adjusted_price: 105 },
      expect.objectContaining({ transaction: fakeTransaction }),
    );
  });

  it("should apply LOW supply multiplier when occupancy is low", async () => {
    // base=200, seasonal=1.0, supply=0.9 (rate 0.2 → LOW) → price=180
    // adjusted_price is 200 → needs update
    setupRepos({
      unitTypes: [{ id: 2, base_price: 200, adjusted_price: 200 }],
      unitCountMap: new Map([[2, 10]]),
      occupiedCountMap: new Map([[2, 2]]), // 2/10 = 0.2 → LOW(0.9)
      seasonalMultiplier: 1.0,
    });

    const result = await adjustStorageUnitPrice();

    expect(result.updatedTypes).toBe(1);
    expect(mockUnitTypeRepo.updateTypeById).toHaveBeenCalledWith(
      2,
      { adjusted_price: 180 },
      expect.objectContaining({ transaction: fakeTransaction }),
    );
  });

  it("should handle multiple unit types — update only those that changed", async () => {
    const types = [
      { id: 1, base_price: 100, adjusted_price: 100 },
      { id: 2, base_price: 200, adjusted_price: 200 },
    ];
    mockUnitTypeRepo.getAllTypes.mockResolvedValue(types);
    mockStorageUnitRepo.getUnitCountsByType.mockResolvedValue(
      new Map([
        [1, 10],
        [2, 10],
      ]),
    );
    mockStorageUnitRepo.getCurrentOccupiedCountsByType.mockResolvedValue(
      new Map([
        [1, 4], // 0.4 → NORMAL(1.0)
        [2, 6], // 0.6 → TIGHT(1.05)
      ]),
    );
    // seasonal=1.0 for both
    mockSeasonalPricingRepo.getMultiplierById.mockResolvedValue({
      multiplier: 1.0,
    });
    mockUnitTypeRepo.updateTypeById.mockResolvedValue([1]);

    const result = await adjustStorageUnitPrice();

    // type 1: 100*1.0*1.0 = 100 (same) → skip
    // type 2: 200*1.0*1.05 = 210 (changed) → update
    expect(result.updatedTypes).toBe(1);
    expect(mockUnitTypeRepo.updateTypeById).toHaveBeenCalledTimes(1);
    expect(mockUnitTypeRepo.updateTypeById).toHaveBeenCalledWith(
      2,
      { adjusted_price: 210 },
      expect.any(Object),
    );
  });

  it("should default seasonal multiplier to 1 when no row found", async () => {
    setupRepos({
      unitTypes: [{ id: 1, base_price: 100, adjusted_price: 100 }],
      unitCountMap: new Map([[1, 10]]),
      occupiedCountMap: new Map([[1, 6]]), // TIGHT(1.05)
      seasonalMultiplier: null, // no seasonal pricing row
    });

    const result = await adjustStorageUnitPrice();

    // 100 * 1.0 * 1.05 = 105 → different from 100 → update
    expect(result.updatedTypes).toBe(1);
    expect(mockUnitTypeRepo.updateTypeById).toHaveBeenCalledWith(
      1,
      { adjusted_price: 105 },
      expect.any(Object),
    );
  });

  it("should handle 0 total units (avoid division by zero)", async () => {
    setupRepos({
      unitTypes: [{ id: 1, base_price: 100, adjusted_price: 100 }],
      unitCountMap: new Map(), // no units for type 1
      occupiedCountMap: new Map(),
      seasonalMultiplier: 1.0,
    });

    const result = await adjustStorageUnitPrice();

    // 0 units → occRate=0 → LOW(0.9) → price=90 → different → update
    expect(result.updatedTypes).toBe(1);
    expect(mockUnitTypeRepo.updateTypeById).toHaveBeenCalledWith(
      1,
      { adjusted_price: 90 },
      expect.any(Object),
    );
  });

  it("should include month label in the result", async () => {
    setupRepos({
      unitTypes: [],
      unitCountMap: new Map(),
      occupiedCountMap: new Map(),
      seasonalMultiplier: 1,
    });

    const result = await adjustStorageUnitPrice();

    expect(result.month).toBeDefined();
    expect(typeof result.month).toBe("string");
  });

  it("should run inside a transaction", async () => {
    setupRepos({
      unitTypes: [],
      unitCountMap: new Map(),
      occupiedCountMap: new Map(),
      seasonalMultiplier: 1,
    });

    await adjustStorageUnitPrice();

    expect(mockSequelize.transaction).toHaveBeenCalledTimes(1);
  });
});
