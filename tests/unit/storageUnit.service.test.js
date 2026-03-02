import { jest, describe, it, expect, beforeEach } from "@jest/globals";

// ── Mocks ────────────────────────────────────────────────────────────
const mockStorageUnitRepo = {
  getAllUnits: jest.fn(),
  findUnitById: jest.fn(),
  patchUnitStatus: jest.fn(),
  getAllUnitsWithTenants: jest.fn(),
};

jest.unstable_mockModule("../../src/repositories/storage_unit.repo.js", () => ({
  storageUnitRepo: mockStorageUnitRepo,
}));

const { storageUnitService } =
  await import("../../src/services/storageUnit.service.js");

beforeEach(() => jest.clearAllMocks());

const fakeUnit = {
  id: 1,
  unit_number: "A-01",
  type_id: 1,
  status: "AVAILABLE",
  is_active: 1,
};

// =====================================================================
// getAllUnits()
// =====================================================================
describe("storageUnitService.getAllUnits", () => {
  it("should return units with no filters", async () => {
    mockStorageUnitRepo.getAllUnits.mockResolvedValue([fakeUnit]);
    const result = await storageUnitService.getAllUnits({});
    expect(result).toEqual([fakeUnit]);
    expect(mockStorageUnitRepo.getAllUnits).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ order: [["type_id", "ASC"]] }),
    );
  });

  it("should apply type_id filter", async () => {
    mockStorageUnitRepo.getAllUnits.mockResolvedValue([fakeUnit]);
    await storageUnitService.getAllUnits({ type_id: "2" });
    expect(mockStorageUnitRepo.getAllUnits).toHaveBeenCalledWith(
      expect.objectContaining({ type_id: 2 }),
      expect.any(Object),
    );
  });

  it("should throw 400 for invalid status", async () => {
    await expect(
      storageUnitService.getAllUnits({ status: "BROKEN" }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("should throw 404 when no units found", async () => {
    mockStorageUnitRepo.getAllUnits.mockResolvedValue(null);
    await expect(storageUnitService.getAllUnits({})).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});

// =====================================================================
// updateUnitStatus()
// =====================================================================
describe("storageUnitService.updateUnitStatus", () => {
  it("should throw 404 when unit not found", async () => {
    mockStorageUnitRepo.findUnitById.mockResolvedValue(null);
    await expect(
      storageUnitService.updateUnitStatus(999, { status: "AVAILABLE" }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("should throw 400 when no payload", async () => {
    mockStorageUnitRepo.findUnitById.mockResolvedValue(fakeUnit);
    await expect(
      storageUnitService.updateUnitStatus(1, null),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("should throw 400 for invalid status value", async () => {
    mockStorageUnitRepo.findUnitById.mockResolvedValue(fakeUnit);
    await expect(
      storageUnitService.updateUnitStatus(1, { status: "DESTROYED" }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("should update and return the unit", async () => {
    const updated = { ...fakeUnit, status: "MAINTENANCE" };
    mockStorageUnitRepo.findUnitById
      .mockResolvedValueOnce(fakeUnit)
      .mockResolvedValueOnce(updated);
    mockStorageUnitRepo.patchUnitStatus.mockResolvedValue([1]);

    const result = await storageUnitService.updateUnitStatus(1, {
      status: "MAINTENANCE",
    });
    expect(mockStorageUnitRepo.patchUnitStatus).toHaveBeenCalledWith(1, {
      status: "MAINTENANCE",
    });
    expect(result.status).toBe("MAINTENANCE");
  });
});

// =====================================================================
// getUnitById()
// =====================================================================
describe("storageUnitService.getUnitById", () => {
  it("should throw 404 when not found", async () => {
    mockStorageUnitRepo.findUnitById.mockResolvedValue(null);
    await expect(storageUnitService.getUnitById(999)).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it("should return the unit", async () => {
    mockStorageUnitRepo.findUnitById.mockResolvedValue(fakeUnit);
    const result = await storageUnitService.getUnitById(1);
    expect(result.id).toBe(1);
  });
});

// =====================================================================
// getAllUnitsWithTenant()
// =====================================================================
describe("storageUnitService.getAllUnitsWithTenant", () => {
  it("should throw 401 when not admin", async () => {
    await expect(
      storageUnitService.getAllUnitsWithTenant({}, { role: "CUSTOMER" }),
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  it("should throw 401 when no authUser", async () => {
    await expect(
      storageUnitService.getAllUnitsWithTenant({}, null),
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  it("should throw 404 when no units", async () => {
    mockStorageUnitRepo.getAllUnitsWithTenants.mockResolvedValue([]);
    await expect(
      storageUnitService.getAllUnitsWithTenant({}, { role: "ADMIN" }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("should return units for admin", async () => {
    mockStorageUnitRepo.getAllUnitsWithTenants.mockResolvedValue([fakeUnit]);
    const result = await storageUnitService.getAllUnitsWithTenant(
      {},
      { role: "ADMIN" },
    );
    expect(result).toEqual([fakeUnit]);
  });

  it("should throw 400 for invalid status filter", async () => {
    await expect(
      storageUnitService.getAllUnitsWithTenant(
        { status: "INVALID" },
        { role: "ADMIN" },
      ),
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});
