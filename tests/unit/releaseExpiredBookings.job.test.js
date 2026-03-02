import { jest, describe, it, expect, beforeEach } from "@jest/globals";

// ── Mocks ────────────────────────────────────────────────────────────
const mockBookingRepo = {
  findExpiredPending: jest.fn(),
  bulkCancel: jest.fn(),
};

const mockStorageUnitRepo = {
  releaseExpiredUnits: jest.fn(),
};

const fakeTransaction = { LOCK: { UPDATE: "UPDATE" } };
const mockSequelize = {
  transaction: jest.fn((cb) => cb(fakeTransaction)),
};

jest.unstable_mockModule("../../src/db/sequelize.js", () => ({
  sequelize: mockSequelize,
}));
jest.unstable_mockModule("../../src/repositories/booking.repo.js", () => ({
  bookingRepo: mockBookingRepo,
}));
jest.unstable_mockModule(
  "../../src/repositories/storage_unit.repo.js",
  () => ({
    storageUnitRepo: mockStorageUnitRepo,
  }),
);

const { releaseExpiredBookings } = await import(
  "../../src/jobs/definitions/releaseExpiredBookings.job.js"
);

beforeEach(() => jest.clearAllMocks());

// =====================================================================
describe("releaseExpiredBookings job", () => {
  it("should return { cancelled: 0 } when no expired bookings", async () => {
    mockBookingRepo.findExpiredPending.mockResolvedValue([]);

    const result = await releaseExpiredBookings();

    expect(result).toEqual({ cancelled: 0 });
    expect(mockBookingRepo.bulkCancel).not.toHaveBeenCalled();
    expect(mockStorageUnitRepo.releaseExpiredUnits).not.toHaveBeenCalled();
  });

  it("should cancel expired bookings and release their units", async () => {
    const expired = [
      { id: "BK-1", unit_id: 10, unit: { id: 10 } },
      { id: "BK-2", unit_id: 20, unit: { id: 20 } },
    ];
    mockBookingRepo.findExpiredPending.mockResolvedValue(expired);
    mockBookingRepo.bulkCancel.mockResolvedValue([2]);
    mockStorageUnitRepo.releaseExpiredUnits.mockResolvedValue([2]);

    const result = await releaseExpiredBookings();

    expect(result).toEqual({ cancelled: 2 });
    expect(mockBookingRepo.bulkCancel).toHaveBeenCalledWith(
      ["BK-1", "BK-2"],
      expect.objectContaining({ transaction: fakeTransaction }),
    );
    expect(mockStorageUnitRepo.releaseExpiredUnits).toHaveBeenCalledWith(
      [10, 20],
      expect.objectContaining({ transaction: fakeTransaction }),
    );
  });

  it("should pass a cutoff date 5 days in the past to findExpiredPending", async () => {
    mockBookingRepo.findExpiredPending.mockResolvedValue([]);

    await releaseExpiredBookings();

    const cutoff = mockBookingRepo.findExpiredPending.mock.calls[0][0];
    expect(cutoff).toBeInstanceOf(Date);
    // cutoff should be ~5 days ago (allow 10s tolerance for test runtime)
    const fiveDaysMs = 5 * 24 * 60 * 60 * 1000;
    const diff = Math.abs(Date.now() - fiveDaysMs - cutoff.getTime());
    expect(diff).toBeLessThan(10_000);
  });

  it("should run inside a transaction", async () => {
    mockBookingRepo.findExpiredPending.mockResolvedValue([]);
    await releaseExpiredBookings();
    expect(mockSequelize.transaction).toHaveBeenCalledTimes(1);
  });
});
