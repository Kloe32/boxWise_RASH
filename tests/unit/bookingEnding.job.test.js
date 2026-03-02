import { jest, describe, it, expect, beforeEach } from "@jest/globals";

// ── Mocks ────────────────────────────────────────────────────────────
const mockBookingRepo = {
  findApproachingEndBookings: jest.fn(),
  bulkVacate: jest.fn(),
};

const mockSendEmail = jest.fn();

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
jest.unstable_mockModule("../../src/utils/mail.js", () => ({
  sendEmail: mockSendEmail,
  vacatingNoticeMailgenContent: jest.fn(() => "vacating-email-content"),
}));

const { bookingEnding } = await import(
  "../../src/jobs/definitions/bookingEnding.job.js"
);

beforeEach(() => {
  jest.clearAllMocks();
  mockSendEmail.mockResolvedValue(undefined);
});

// =====================================================================
describe("bookingEnding job", () => {
  it("should return { flagged: 0, notified: 0 } when no approaching bookings", async () => {
    mockBookingRepo.findApproachingEndBookings.mockResolvedValue([]);

    const result = await bookingEnding();

    expect(result).toEqual({ flagged: 0, notified: 0 });
    expect(mockBookingRepo.bulkVacate).not.toHaveBeenCalled();
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("should flag approaching bookings as VACATING and send emails", async () => {
    const bookings = [
      {
        id: "BK-1",
        end_date: "2026-03-04",
        user: { full_name: "Alice", email: "alice@test.com" },
        unit: { unit_number: "A-01" },
      },
      {
        id: "BK-2",
        end_date: "2026-03-04",
        user: { full_name: "Bob", email: "bob@test.com" },
        unit: { unit_number: "B-02" },
      },
    ];
    mockBookingRepo.findApproachingEndBookings.mockResolvedValue(bookings);
    mockBookingRepo.bulkVacate.mockResolvedValue([2]);

    const result = await bookingEnding();

    expect(result).toEqual({ flagged: 2, notified: 2 });
    expect(mockBookingRepo.bulkVacate).toHaveBeenCalledWith(
      ["BK-1", "BK-2"],
      expect.objectContaining({ transaction: fakeTransaction }),
    );
    expect(mockSendEmail).toHaveBeenCalledTimes(2);
  });

  it("should pass a target date 2 days from now", async () => {
    mockBookingRepo.findApproachingEndBookings.mockResolvedValue([]);

    await bookingEnding();

    const targetDate =
      mockBookingRepo.findApproachingEndBookings.mock.calls[0][0];
    const expected = new Date();
    expected.setDate(expected.getDate() + 2);
    expect(targetDate).toBe(expected.toISOString().slice(0, 10));
  });

  it("should still return flagged count even if email fails", async () => {
    const bookings = [
      {
        id: "BK-1",
        end_date: "2026-03-04",
        user: { full_name: "Alice", email: "alice@test.com" },
        unit: { unit_number: "A-01" },
      },
    ];
    mockBookingRepo.findApproachingEndBookings.mockResolvedValue(bookings);
    mockBookingRepo.bulkVacate.mockResolvedValue([1]);
    mockSendEmail.mockRejectedValue(new Error("SMTP down"));

    const result = await bookingEnding();

    expect(result.flagged).toBe(1);
    expect(result.notified).toBe(0); // email failed
  });

  it("should run inside a transaction", async () => {
    mockBookingRepo.findApproachingEndBookings.mockResolvedValue([]);
    await bookingEnding();
    expect(mockSequelize.transaction).toHaveBeenCalledTimes(1);
  });
});
