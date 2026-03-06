import { jest, describe, it, expect, beforeEach } from "@jest/globals";

// ── Mocks ────────────────────────────────────────────────────────────
const mockBookingRepo = {
  findBookingsWithOverduePayments: jest.fn(),
  updateBookingById: jest.fn(),
};

const mockPaymentRepo = {
  updatePaymentById: jest.fn(),
  updatePaymentByBookingId: jest.fn(),
};

const mockStorageUnitRepo = {
  patchUnitStatus: jest.fn(),
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
jest.unstable_mockModule("../../src/repositories/payment.repo.js", () => ({
  paymentRepo: mockPaymentRepo,
}));
jest.unstable_mockModule("../../src/repositories/storage_unit.repo.js", () => ({
  storageUnitRepo: mockStorageUnitRepo,
}));
jest.unstable_mockModule("../../src/utils/mail.js", () => ({
  overduePaymentMailgenContent: jest.fn(() => "overdue-email-content"),
  sendEmail: mockSendEmail,
}));

const { overduePayment } =
  await import("../../src/jobs/definitions/overduePayment.job.js");

beforeEach(() => {
  jest.clearAllMocks();
  mockSendEmail.mockResolvedValue(undefined);
});

// =====================================================================
describe("overduePayment job", () => {
  it("should return { cancelled: 0, notified: 0 } when no overdue bookings", async () => {
    mockBookingRepo.findBookingsWithOverduePayments.mockResolvedValue([]);

    const result = await overduePayment();

    expect(result).toEqual({ cancelled: 0, notified: 0 });
    expect(mockBookingRepo.updateBookingById).not.toHaveBeenCalled();
    expect(mockStorageUnitRepo.patchUnitStatus).not.toHaveBeenCalled();
  });

  it("should cancel overdue bookings, fail payments, release units, and send emails", async () => {
    const overdueBookings = [
      {
        id: "BK-1",
        unit_id: 10,
        user: { full_name: "Alice", email: "alice@test.com" },
        unit: { unit_number: "A-01" },
        payments: [
          {
            id: 101,
            amount: 100,
            due_date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
            payment_status: "PENDING",
          },
        ],
      },
    ];
    mockBookingRepo.findBookingsWithOverduePayments.mockResolvedValue(
      overdueBookings,
    );
    mockPaymentRepo.updatePaymentById.mockResolvedValue([1]);
    mockPaymentRepo.updatePaymentByBookingId.mockResolvedValue([1]);
    mockBookingRepo.updateBookingById.mockResolvedValue([1]);
    mockStorageUnitRepo.patchUnitStatus.mockResolvedValue([1]);

    const result = await overduePayment();

    expect(result).toEqual({ cancelled: 1, notified: 1 });

    // Overdue payment marked FAILED
    expect(mockPaymentRepo.updatePaymentById).toHaveBeenCalledWith(
      101,
      { payment_status: "FAILED" },
      expect.objectContaining({ transaction: fakeTransaction }),
    );

    // All remaining PENDING payments cancelled
    expect(mockPaymentRepo.updatePaymentByBookingId).toHaveBeenCalledWith(
      "BK-1",
      { payment_status: "FAILED" },
      expect.objectContaining({ transaction: fakeTransaction }),
    );

    // Booking cancelled
    expect(mockBookingRepo.updateBookingById).toHaveBeenCalledWith(
      "BK-1",
      { status: "CANCELLED" },
      expect.objectContaining({ transaction: fakeTransaction }),
    );

    // Unit released
    expect(mockStorageUnitRepo.patchUnitStatus).toHaveBeenCalledWith(
      10,
      { status: "AVAILABLE" },
      expect.objectContaining({ transaction: fakeTransaction }),
    );

    // Email sent
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "alice@test.com",
        subject: "Overdue Payment - Booking Cancelled - BoxWise",
      }),
    );
  });

  it("should still cancel booking when email fails", async () => {
    const overdueBookings = [
      {
        id: "BK-2",
        unit_id: 20,
        user: { full_name: "Bob", email: "bob@test.com" },
        unit: { unit_number: "B-02" },
        payments: [
          {
            id: 201,
            amount: 150,
            due_date: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
            payment_status: "PENDING",
          },
        ],
      },
    ];
    mockBookingRepo.findBookingsWithOverduePayments.mockResolvedValue(
      overdueBookings,
    );
    mockPaymentRepo.updatePaymentById.mockResolvedValue([1]);
    mockPaymentRepo.updatePaymentByBookingId.mockResolvedValue([1]);
    mockBookingRepo.updateBookingById.mockResolvedValue([1]);
    mockStorageUnitRepo.patchUnitStatus.mockResolvedValue([1]);
    mockSendEmail.mockRejectedValue(new Error("SMTP down"));

    const result = await overduePayment();

    // Booking still cancelled, just email failed
    expect(result).toEqual({ cancelled: 1, notified: 0 });
    expect(mockBookingRepo.updateBookingById).toHaveBeenCalledWith(
      "BK-2",
      { status: "CANCELLED" },
      expect.objectContaining({ transaction: fakeTransaction }),
    );
  });

  it("should use a 7-day grace period cutoff", async () => {
    mockBookingRepo.findBookingsWithOverduePayments.mockResolvedValue([]);

    await overduePayment();

    const cutoff =
      mockBookingRepo.findBookingsWithOverduePayments.mock.calls[0][0];
    expect(cutoff).toBeInstanceOf(Date);
    // cutoff should be ~7 days ago (allow 10s tolerance)
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const diff = Math.abs(Date.now() - sevenDaysMs - cutoff.getTime());
    expect(diff).toBeLessThan(10_000);
  });

  it("should handle multiple overdue bookings", async () => {
    const overdueBookings = [
      {
        id: "BK-3",
        unit_id: 30,
        user: { full_name: "Charlie", email: "charlie@test.com" },
        unit: { unit_number: "C-03" },
        payments: [
          {
            id: 301,
            amount: 200,
            due_date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
            payment_status: "PENDING",
          },
        ],
      },
      {
        id: "BK-4",
        unit_id: 40,
        user: { full_name: "Diana", email: "diana@test.com" },
        unit: { unit_number: "D-04" },
        payments: [
          {
            id: 401,
            amount: 250,
            due_date: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
            payment_status: "PENDING",
          },
        ],
      },
    ];
    mockBookingRepo.findBookingsWithOverduePayments.mockResolvedValue(
      overdueBookings,
    );
    mockPaymentRepo.updatePaymentById.mockResolvedValue([1]);
    mockPaymentRepo.updatePaymentByBookingId.mockResolvedValue([1]);
    mockBookingRepo.updateBookingById.mockResolvedValue([1]);
    mockStorageUnitRepo.patchUnitStatus.mockResolvedValue([1]);

    const result = await overduePayment();

    expect(result).toEqual({ cancelled: 2, notified: 2 });
    expect(mockBookingRepo.updateBookingById).toHaveBeenCalledTimes(2);
    expect(mockStorageUnitRepo.patchUnitStatus).toHaveBeenCalledTimes(2);
    expect(mockSendEmail).toHaveBeenCalledTimes(2);
  });

  it("should run inside a transaction", async () => {
    mockBookingRepo.findBookingsWithOverduePayments.mockResolvedValue([]);

    await overduePayment();

    expect(mockSequelize.transaction).toHaveBeenCalledTimes(1);
  });
});
