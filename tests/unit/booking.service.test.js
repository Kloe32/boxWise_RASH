import { jest, describe, it, expect, beforeEach } from "@jest/globals";

// ── Mocks ────────────────────────────────────────────────────────────
const mockBookingRepo = {
  createBooking: jest.fn(),
  findBookingById: jest.fn(),
  findAllBooking: jest.fn(),
  findOverlappingBookings: jest.fn(),
  updateBookingById: jest.fn(),
};

const mockStorageUnitRepo = {
  findUnitForUpdate: jest.fn(),
  patchUnitStatus: jest.fn(),
};

const mockPaymentService = {
  createInitialPayment: jest.fn(),
  createRecurringPayments: jest.fn(),
  createRenewalPayment: jest.fn(),
  markPaymentAsPaid: jest.fn(),
  cancelPaymentsByBookingId: jest.fn(),
  cancelPendingPaymentsAfterDate: jest.fn(),
};

const mockPaymentRepo = {
  findPaymentById: jest.fn(),
};

const mockSendEmail = jest.fn();

// Fake transaction — just calls the callback with a transaction object
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
jest.unstable_mockModule("../../src/repositories/storage_unit.repo.js", () => ({
  storageUnitRepo: mockStorageUnitRepo,
}));
jest.unstable_mockModule("../../src/services/payment.service.js", () => ({
  paymentService: mockPaymentService,
}));
jest.unstable_mockModule("../../src/repositories/payment.repo.js", () => ({
  paymentRepo: mockPaymentRepo,
}));
jest.unstable_mockModule("../../src/pricing/pricing.engine.js", () => ({
  calculateFinalPrice: jest.fn((price, dur) => ({
    subtotal: price * dur,
    gst: 0,
    gst_rate: 0.09,
    total: price * dur + 50,
    adminFee: 50,
    breakdown: {
      initial_payment: String(price + 50),
      recurring_months: Math.max(dur - 1, 0),
      monthly_charge: String(price),
    },
  })),
}));
jest.unstable_mockModule("../../src/utils/mail.js", () => ({
  sendEmail: mockSendEmail,
  bookingCreatedInfoMailgenContent: jest.fn(() => "email-content"),
  bookingConfirmedMailgenContent: jest.fn(() => "email-content"),
  bookingCancelledMailgenContent: jest.fn(() => "email-content"),
  earlyReturnRequestedMailgenContent: jest.fn(() => "email-content"),
  earlyMoveOutApprovalMailgenContent: jest.fn(() => "email-content"),
  bookingEndedMailgenContent: jest.fn(() => "email-content"),
  renewalRequestedMailgenContent: jest.fn(() => "email-content"),
  renewalApprovedMailgenContent: jest.fn(() => "email-content"),
  paymentConfirmedMailgenContent: jest.fn(() => "email-content"),
}));
const { bookingService } =
  await import("../../src/services/booking.service.js");

// ── Helpers ──────────────────────────────────────────────────────────
const adminUser = {
  id: 1,
  email: "admin@test.com",
  full_name: "Admin",
  role: "ADMIN",
};
const customerUser = {
  id: 2,
  email: "cust@test.com",
  full_name: "Customer",
  role: "CUSTOMER",
};

const fakeUnit = {
  id: 1,
  unit_number: "A-01",
  type_id: 1,
  type: { adjusted_price: 100, base_price: 80 },
  update: jest.fn(),
};

const fakeBooking = {
  id: "BK-20260301-U01-1234",
  user_id: 2,
  unit_id: 1,
  start_date: "2026-03-01",
  end_date: "2026-06-01",
  status: "CONFIRMED",
  return_date: null,
  is_vacated: false,
  renewal_status: "NONE",
  renewal_requested_date: null,
  final_price: 350,
  created_at: new Date(),
  user: { id: 2, full_name: "Customer", email: "cust@test.com" },
  unit: {
    id: 1,
    unit_number: "A-01",
    type_id: 1,
    type: { adjusted_price: 100 },
  },
  payments: [
    {
      id: 10,
      payment_method: "CARD",
      due_date: "2026-03-05",
      payment_status: "PENDING",
    },
  ],
};

beforeEach(() => {
  jest.clearAllMocks();
  mockSendEmail.mockResolvedValue(undefined);
});

// =====================================================================
// createBooking()
// =====================================================================
describe("bookingService.createBooking", () => {
  it("should throw 401 when authUser has no id", async () => {
    await expect(
      bookingService.createBooking(
        { unit_id: 1, start_date: "2026-04-01", duration: 3, method: "CARD" },
        {},
      ),
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  it("should throw 400 when unit_id, start_date or duration missing", async () => {
    await expect(
      bookingService.createBooking(
        {
          unit_id: null,
          start_date: "2026-04-01",
          duration: 3,
          method: "CARD",
        },
        customerUser,
      ),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("should throw 400 when method missing", async () => {
    await expect(
      bookingService.createBooking(
        { unit_id: 1, start_date: "2026-04-01", duration: 3, method: null },
        customerUser,
      ),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("should throw 400 for invalid start_date", async () => {
    await expect(
      bookingService.createBooking(
        { unit_id: 1, start_date: "not-a-date", duration: 3, method: "CARD" },
        customerUser,
      ),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("should throw 404 when unit not found", async () => {
    mockStorageUnitRepo.findUnitForUpdate.mockResolvedValue(null);
    await expect(
      bookingService.createBooking(
        { unit_id: 999, start_date: "2026-04-01", duration: 3, method: "CARD" },
        customerUser,
      ),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("should throw 409 when overlapping bookings exist", async () => {
    mockStorageUnitRepo.findUnitForUpdate.mockResolvedValue(fakeUnit);
    mockBookingRepo.findOverlappingBookings.mockResolvedValue([{ id: "BK-X" }]);

    await expect(
      bookingService.createBooking(
        { unit_id: 1, start_date: "2026-04-01", duration: 3, method: "CARD" },
        customerUser,
      ),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it("should create booking, reserve unit, create payment and send email", async () => {
    mockStorageUnitRepo.findUnitForUpdate.mockResolvedValue(fakeUnit);
    mockBookingRepo.findOverlappingBookings.mockResolvedValue([]);
    mockBookingRepo.createBooking.mockResolvedValue({
      id: "BK-NEW",
      ...fakeBooking,
    });
    fakeUnit.update.mockResolvedValue(true);
    mockPaymentService.createInitialPayment.mockResolvedValue({ id: 1 });

    const result = await bookingService.createBooking(
      { unit_id: 1, start_date: "2026-04-01", duration: 3, method: "CARD" },
      customerUser,
    );

    expect(mockBookingRepo.createBooking).toHaveBeenCalled();
    expect(fakeUnit.update).toHaveBeenCalledWith(
      { status: "RESERVED" },
      expect.any(Object),
    );
    expect(mockPaymentService.createInitialPayment).toHaveBeenCalled();
    expect(mockSendEmail).toHaveBeenCalled();
    expect(result).toHaveProperty("booking");
    expect(result).toHaveProperty("receipt");
  });

  it("should not throw if email fails (just logs)", async () => {
    mockStorageUnitRepo.findUnitForUpdate.mockResolvedValue(fakeUnit);
    mockBookingRepo.findOverlappingBookings.mockResolvedValue([]);
    mockBookingRepo.createBooking.mockResolvedValue({
      id: "BK-NEW",
      ...fakeBooking,
    });
    fakeUnit.update.mockResolvedValue(true);
    mockPaymentService.createInitialPayment.mockResolvedValue({ id: 1 });
    mockSendEmail.mockRejectedValue(new Error("SMTP down"));

    await expect(
      bookingService.createBooking(
        { unit_id: 1, start_date: "2026-04-01", duration: 3, method: "CARD" },
        customerUser,
      ),
    ).resolves.toHaveProperty("booking");
  });
});

// =====================================================================
// confirmBooking()
// =====================================================================
describe("bookingService.confirmBooking", () => {
  it("should throw 401 when not admin", async () => {
    await expect(
      bookingService.confirmBooking("BK-1", customerUser),
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  it("should throw 400 when bookingId is empty", async () => {
    await expect(
      bookingService.confirmBooking(null, adminUser),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("should throw 404 when booking not found", async () => {
    mockBookingRepo.findBookingById.mockResolvedValue(null);
    await expect(
      bookingService.confirmBooking("BK-NONE", adminUser),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("should throw 400 when booking is CANCELLED", async () => {
    mockBookingRepo.findBookingById.mockResolvedValue({
      ...fakeBooking,
      status: "CANCELLED",
    });
    await expect(
      bookingService.confirmBooking("BK-1", adminUser),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("should confirm booking, mark payment paid, set OCCUPIED", async () => {
    const recentBooking = {
      ...fakeBooking,
      status: "PENDING",
      created_at: new Date(), // just created
    };
    mockBookingRepo.findBookingById
      .mockResolvedValueOnce(recentBooking) // first fetch
      .mockResolvedValueOnce({ ...recentBooking, status: "CONFIRMED" }); // after update
    mockPaymentService.markPaymentAsPaid.mockResolvedValue([1]);
    mockPaymentService.createRecurringPayments.mockResolvedValue([]);
    mockBookingRepo.updateBookingById.mockResolvedValue([1]);
    mockStorageUnitRepo.patchUnitStatus.mockResolvedValue([1]);

    const result = await bookingService.confirmBooking(
      fakeBooking.id,
      adminUser,
    );

    expect(mockPaymentService.markPaymentAsPaid).toHaveBeenCalledWith(
      10,
      expect.any(Object),
    );
    expect(mockBookingRepo.updateBookingById).toHaveBeenCalledWith(
      fakeBooking.id,
      { status: "CONFIRMED" },
      expect.any(Object),
    );
    expect(mockStorageUnitRepo.patchUnitStatus).toHaveBeenCalledWith(
      fakeBooking.unit_id,
      { status: "OCCUPIED" },
      expect.any(Object),
    );
  });
});

// =====================================================================
// listBookings()
// =====================================================================
describe("bookingService.listBookings", () => {
  it("should throw 401 when no authUser", async () => {
    await expect(bookingService.listBookings({}, null)).rejects.toMatchObject({
      statusCode: 401,
    });
  });

  it("should throw 400 for invalid status", async () => {
    await expect(
      bookingService.listBookings({ status: "INVALID" }, adminUser),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("should filter by user_id for CUSTOMER", async () => {
    mockBookingRepo.findAllBooking.mockResolvedValue([]);
    await bookingService.listBookings({}, customerUser);
    expect(mockBookingRepo.findAllBooking).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 2 }),
    );
  });

  it("should NOT filter by user_id for ADMIN", async () => {
    mockBookingRepo.findAllBooking.mockResolvedValue([]);
    await bookingService.listBookings({}, adminUser);
    const filter = mockBookingRepo.findAllBooking.mock.calls[0][0];
    expect(filter.user_id).toBeUndefined();
  });

  it("should add year filter when query.year provided", async () => {
    mockBookingRepo.findAllBooking.mockResolvedValue([]);
    await bookingService.listBookings({ year: "2026" }, adminUser);
    const filter = mockBookingRepo.findAllBooking.mock.calls[0][0];
    expect(filter.created_at).toBeDefined();
  });
});

// =====================================================================
// cancelBooking()
// =====================================================================
describe("bookingService.cancelBooking", () => {
  it("should throw 401 when no authUser", async () => {
    await expect(
      bookingService.cancelBooking("BK-1", null),
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  it("should throw 402 when no booking_id", async () => {
    await expect(
      bookingService.cancelBooking(null, adminUser),
    ).rejects.toMatchObject({ statusCode: 402 });
  });

  it("should throw 404 when booking not found", async () => {
    mockBookingRepo.findBookingById.mockResolvedValue(null);
    await expect(
      bookingService.cancelBooking("BK-NONE", adminUser),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("should cancel booking, release unit, fail payments, send email", async () => {
    mockBookingRepo.findBookingById.mockResolvedValue(fakeBooking);
    mockBookingRepo.updateBookingById.mockResolvedValue([1]);
    mockStorageUnitRepo.patchUnitStatus.mockResolvedValue([1]);
    mockPaymentService.cancelPaymentsByBookingId.mockResolvedValue([1]);

    const result = await bookingService.cancelBooking(
      fakeBooking.id,
      adminUser,
    );

    expect(mockBookingRepo.updateBookingById).toHaveBeenCalledWith(
      fakeBooking.id,
      { status: "CANCELLED" },
      expect.any(Object),
    );
    expect(mockStorageUnitRepo.patchUnitStatus).toHaveBeenCalledWith(
      fakeBooking.unit_id,
      { status: "AVAILABLE" },
      expect.any(Object),
    );
    expect(mockPaymentService.cancelPaymentsByBookingId).toHaveBeenCalledWith(
      fakeBooking.id,
      expect.any(Object),
    );
  });
});

// =====================================================================
// requestEarlyReturn()
// =====================================================================
describe("bookingService.requestEarlyReturn", () => {
  it("should throw 401 when no authUser", async () => {
    await expect(
      bookingService.requestEarlyReturn("BK-1", "2026-04-01", null),
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  it("should throw 402 when no booking_id", async () => {
    await expect(
      bookingService.requestEarlyReturn(null, "2026-04-01", customerUser),
    ).rejects.toMatchObject({ statusCode: 402 });
  });

  it("should throw 400 when no requestedDate", async () => {
    await expect(
      bookingService.requestEarlyReturn("BK-1", null, customerUser),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("should throw 404 when booking not found", async () => {
    mockBookingRepo.findBookingById.mockResolvedValue(null);
    await expect(
      bookingService.requestEarlyReturn("BK-1", "2026-04-01", customerUser),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("should throw 403 when not own booking", async () => {
    mockBookingRepo.findBookingById.mockResolvedValue({
      ...fakeBooking,
      user_id: 999,
    });
    await expect(
      bookingService.requestEarlyReturn("BK-1", "2026-04-01", customerUser),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it("should throw 409 when booking not CONFIRMED/RENEWED", async () => {
    mockBookingRepo.findBookingById.mockResolvedValue({
      ...fakeBooking,
      status: "PENDING",
    });
    await expect(
      bookingService.requestEarlyReturn("BK-1", "2026-04-01", customerUser),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it("should throw 409 when already vacated", async () => {
    mockBookingRepo.findBookingById.mockResolvedValue({
      ...fakeBooking,
      is_vacated: true,
    });
    await expect(
      bookingService.requestEarlyReturn("BK-1", "2026-04-01", customerUser),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it("should throw 409 when return_date already set", async () => {
    mockBookingRepo.findBookingById.mockResolvedValue({
      ...fakeBooking,
      return_date: "2026-04-15",
    });
    await expect(
      bookingService.requestEarlyReturn("BK-1", "2026-04-20", customerUser),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it("should set return_date on valid request and send email", async () => {
    mockBookingRepo.findBookingById
      .mockResolvedValueOnce(fakeBooking)
      .mockResolvedValueOnce({ ...fakeBooking, return_date: "2026-04-15" });
    mockBookingRepo.updateBookingById.mockResolvedValue([1]);

    const result = await bookingService.requestEarlyReturn(
      fakeBooking.id,
      "2026-04-15",
      customerUser,
    );

    expect(mockBookingRepo.updateBookingById).toHaveBeenCalledWith(
      fakeBooking.id,
      { return_date: "2026-04-15" },
    );
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        email: fakeBooking.user.email,
        subject: expect.stringContaining("Early Return Requested"),
      }),
    );
  });

  it("should not throw if email fails (just logs)", async () => {
    mockBookingRepo.findBookingById
      .mockResolvedValueOnce(fakeBooking)
      .mockResolvedValueOnce({ ...fakeBooking, return_date: "2026-04-15" });
    mockBookingRepo.updateBookingById.mockResolvedValue([1]);
    mockSendEmail.mockRejectedValueOnce(new Error("SMTP down"));

    const result = await bookingService.requestEarlyReturn(
      fakeBooking.id,
      "2026-04-15",
      customerUser,
    );

    expect(result).toBeDefined();
  });
});

// =====================================================================
// confirmBookingEnding()
// =====================================================================
describe("bookingService.confirmBookingEnding", () => {
  it("should throw 401 when not admin", async () => {
    await expect(
      bookingService.confirmBookingEnding("BK-1", customerUser),
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  it("should throw 402 when no booking_id", async () => {
    await expect(
      bookingService.confirmBookingEnding(null, adminUser),
    ).rejects.toMatchObject({ statusCode: 402 });
  });

  it("should throw 404 when booking not found", async () => {
    mockBookingRepo.findBookingById.mockResolvedValue(null);
    await expect(
      bookingService.confirmBookingEnding("BK-NONE", adminUser),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("should throw 409 when already ENDED", async () => {
    mockBookingRepo.findBookingById.mockResolvedValue({
      ...fakeBooking,
      status: "ENDED",
    });
    await expect(
      bookingService.confirmBookingEnding("BK-1", adminUser),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it("should throw 409 when not VACATING", async () => {
    mockBookingRepo.findBookingById.mockResolvedValue({
      ...fakeBooking,
      status: "CONFIRMED",
    });
    await expect(
      bookingService.confirmBookingEnding("BK-1", adminUser),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it("should end booking, cancel future payments, release unit, send email", async () => {
    mockBookingRepo.findBookingById.mockResolvedValue({
      ...fakeBooking,
      status: "VACATING",
      return_date: "2026-04-15",
    });
    mockBookingRepo.updateBookingById.mockResolvedValue([1]);
    mockPaymentService.cancelPendingPaymentsAfterDate.mockResolvedValue([1]);
    mockStorageUnitRepo.patchUnitStatus.mockResolvedValue([1]);

    await bookingService.confirmBookingEnding(fakeBooking.id, adminUser);

    expect(mockBookingRepo.updateBookingById).toHaveBeenCalledWith(
      fakeBooking.id,
      expect.objectContaining({
        status: "ENDED",
        is_vacated: true,
        return_date: "2026-04-15",
      }),
      expect.any(Object),
    );
    expect(mockStorageUnitRepo.patchUnitStatus).toHaveBeenCalledWith(
      fakeBooking.unit_id,
      { status: "AVAILABLE" },
      expect.any(Object),
    );
  });
});

// =====================================================================
// approveEarlyReturnRequest()
// =====================================================================
describe("bookingService.approveEarlyReturnRequest", () => {
  it("should throw 401 when not admin", async () => {
    await expect(
      bookingService.approveEarlyReturnRequest("BK-1", customerUser),
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  it("should throw 404 when not found", async () => {
    mockBookingRepo.findBookingById.mockResolvedValue(null);
    await expect(
      bookingService.approveEarlyReturnRequest("BK-1", adminUser),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("should throw 409 when booking not CONFIRMED/RENEWED", async () => {
    mockBookingRepo.findBookingById.mockResolvedValue({
      ...fakeBooking,
      status: "PENDING",
    });
    await expect(
      bookingService.approveEarlyReturnRequest("BK-1", adminUser),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it("should throw 409 when already vacated", async () => {
    mockBookingRepo.findBookingById.mockResolvedValue({
      ...fakeBooking,
      is_vacated: true,
      status: "ENDED",
    });
    await expect(
      bookingService.approveEarlyReturnRequest("BK-1", adminUser),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it("should throw 400 when no return_date", async () => {
    mockBookingRepo.findBookingById.mockResolvedValue({
      ...fakeBooking,
      return_date: null,
    });
    await expect(
      bookingService.approveEarlyReturnRequest("BK-1", adminUser),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("should throw 409 when outstanding payments before return date", async () => {
    mockBookingRepo.findBookingById.mockResolvedValue({
      ...fakeBooking,
      return_date: "2026-04-15",
      payments: [{ id: 10, due_date: "2026-04-01", payment_status: "PENDING" }],
    });
    await expect(
      bookingService.approveEarlyReturnRequest("BK-1", adminUser),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it("should approve, set VACATING, cancel future payments, send email", async () => {
    mockBookingRepo.findBookingById.mockResolvedValue({
      ...fakeBooking,
      return_date: "2026-05-15",
      payments: [], // no outstanding
    });
    mockBookingRepo.updateBookingById.mockResolvedValue([1]);
    mockPaymentService.cancelPendingPaymentsAfterDate.mockResolvedValue([1]);

    const result = await bookingService.approveEarlyReturnRequest(
      fakeBooking.id,
      adminUser,
    );

    expect(mockBookingRepo.updateBookingById).toHaveBeenCalledWith(
      fakeBooking.id,
      { status: "VACATING" },
      expect.any(Object),
    );
    expect(result).toEqual({ approved: true });
  });
});

// =====================================================================
// requestRenewal()
// =====================================================================
describe("bookingService.requestRenewal", () => {
  it("should throw 401 when no authUser", async () => {
    await expect(
      bookingService.requestRenewal("BK-1", 3, null),
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  it("should throw 404 when booking not found", async () => {
    mockBookingRepo.findBookingById.mockResolvedValue(null);
    await expect(
      bookingService.requestRenewal("BK-1", 3, customerUser),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("should throw 403 when not own booking", async () => {
    mockBookingRepo.findBookingById.mockResolvedValue({
      ...fakeBooking,
      user_id: 999,
    });
    await expect(
      bookingService.requestRenewal("BK-1", 3, customerUser),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it("should throw 409 when not CONFIRMED", async () => {
    mockBookingRepo.findBookingById.mockResolvedValue({
      ...fakeBooking,
      status: "PENDING",
    });
    await expect(
      bookingService.requestRenewal("BK-1", 3, customerUser),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it("should throw 409 when renewal already requested", async () => {
    mockBookingRepo.findBookingById.mockResolvedValue({
      ...fakeBooking,
      renewal_status: "REQUESTED",
    });
    await expect(
      bookingService.requestRenewal("BK-1", 3, customerUser),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it("should throw 409 when vacated", async () => {
    mockBookingRepo.findBookingById.mockResolvedValue({
      ...fakeBooking,
      is_vacated: true,
    });
    await expect(
      bookingService.requestRenewal("BK-1", 3, customerUser),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it("should update renewal_status to REQUESTED", async () => {
    const updatedRow = { ...fakeBooking, renewal_status: "REQUESTED" };
    mockBookingRepo.findBookingById.mockResolvedValue(fakeBooking);
    mockBookingRepo.updateBookingById.mockResolvedValue([1, [updatedRow]]);

    const result = await bookingService.requestRenewal(
      fakeBooking.id,
      3,
      customerUser,
    );

    expect(mockBookingRepo.updateBookingById).toHaveBeenCalledWith(
      fakeBooking.id,
      expect.objectContaining({ renewal_status: "REQUESTED" }),
      expect.objectContaining({ returning: true }),
    );
  });
});

// =====================================================================
// approveRenewal()
// =====================================================================
describe("bookingService.approveRenewal", () => {
  it("should throw 401 when not admin", async () => {
    await expect(
      bookingService.approveRenewal("BK-1", customerUser),
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  it("should throw 404 when booking not found", async () => {
    mockBookingRepo.findBookingById.mockResolvedValue(null);
    await expect(
      bookingService.approveRenewal("BK-1", adminUser),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("should throw 409 when renewal_status not REQUESTED", async () => {
    mockBookingRepo.findBookingById.mockResolvedValue({
      ...fakeBooking,
      renewal_status: "NONE",
    });
    await expect(
      bookingService.approveRenewal("BK-1", adminUser),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it("should approve renewal, create payments, update status to RENEWED", async () => {
    const renewalBooking = {
      ...fakeBooking,
      renewal_status: "REQUESTED",
      renewal_requested_date: "2026-09-01",
    };
    mockBookingRepo.findBookingById.mockResolvedValue(renewalBooking);
    mockPaymentService.createRenewalPayment.mockResolvedValue([{}, {}]);
    mockBookingRepo.updateBookingById.mockResolvedValue([1]);

    const result = await bookingService.approveRenewal(
      fakeBooking.id,
      adminUser,
    );

    expect(mockPaymentService.createRenewalPayment).toHaveBeenCalled();
    expect(mockBookingRepo.updateBookingById).toHaveBeenCalledWith(
      fakeBooking.id,
      expect.objectContaining({
        status: "RENEWED",
        renewal_status: "NONE",
        renewal_requested_date: null,
        end_date: "2026-09-01",
      }),
      expect.any(Object),
    );
    expect(result).toHaveProperty("renewed", true);
    expect(result).toHaveProperty("newPayments");
  });
});

// =====================================================================
// getPendingBookingsWithDate()
// =====================================================================
describe("bookingService.getPendingBookingsWithDate", () => {
  it("should throw 401 when not admin", async () => {
    await expect(
      bookingService.getPendingBookingsWithDate(customerUser),
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  it("should return totalPending, todayPending, yesterdayPending", async () => {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    mockBookingRepo.findAllBooking.mockResolvedValue([
      { created_at: now }, // today
      { created_at: yesterday }, // yesterday
      { created_at: lastWeek }, // older
    ]);

    const result = await bookingService.getPendingBookingsWithDate(adminUser);
    expect(result.totalPending).toHaveLength(3);
    expect(result.todayPending).toBe(1);
    expect(result.yesterdayPending).toBe(1);
  });
});

// =====================================================================
// confirmPayment()
// =====================================================================
describe("bookingService.confirmPayment", () => {
  const fakePayment = {
    id: 20,
    booking_id: "BK-20260301-U01-1234",
    amount: "100.00",
    description: "Monthly Payment - April 2026",
    due_date: "2026-04-01",
    payment_status: "PENDING",
    payment_method: "CARD",
  };

  it("should throw 401 when not admin", async () => {
    await expect(
      bookingService.confirmPayment(20, customerUser),
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  it("should throw 401 when no authUser", async () => {
    await expect(bookingService.confirmPayment(20, null)).rejects.toMatchObject(
      { statusCode: 401 },
    );
  });

  it("should throw 400 when payment_id is missing", async () => {
    await expect(
      bookingService.confirmPayment(null, adminUser),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("should throw 404 when payment not found", async () => {
    mockPaymentRepo.findPaymentById.mockResolvedValue(null);

    await expect(
      bookingService.confirmPayment(999, adminUser),
    ).rejects.toMatchObject({ statusCode: 404, message: "Payment Not Found!" });
  });

  it("should throw 409 when payment is already PAID", async () => {
    mockPaymentRepo.findPaymentById.mockResolvedValue({
      ...fakePayment,
      payment_status: "PAID",
    });

    await expect(
      bookingService.confirmPayment(20, adminUser),
    ).rejects.toMatchObject({
      statusCode: 409,
      message: "Payment is already made.",
    });
  });

  it("should throw 409 when payment status is FAILED", async () => {
    mockPaymentRepo.findPaymentById.mockResolvedValue({
      ...fakePayment,
      payment_status: "FAILED",
    });

    await expect(
      bookingService.confirmPayment(20, adminUser),
    ).rejects.toMatchObject({
      statusCode: 409,
      message: "Cannot confirm a payment with status 'FAILED'.",
    });
  });

  it("should throw 409 when payment status is OVERDUE", async () => {
    mockPaymentRepo.findPaymentById.mockResolvedValue({
      ...fakePayment,
      payment_status: "OVERDUE",
    });

    await expect(
      bookingService.confirmPayment(20, adminUser),
    ).rejects.toMatchObject({
      statusCode: 409,
      message: "Cannot confirm a payment with status 'OVERDUE'.",
    });
  });

  it("should throw 404 when booking not found", async () => {
    mockPaymentRepo.findPaymentById.mockResolvedValue(fakePayment);
    mockBookingRepo.findBookingById.mockResolvedValue(null);

    await expect(
      bookingService.confirmPayment(20, adminUser),
    ).rejects.toMatchObject({
      statusCode: 404,
      message: "Booking Not Found!",
    });
  });

  it("should throw 409 when booking is not active (PENDING)", async () => {
    mockPaymentRepo.findPaymentById.mockResolvedValue(fakePayment);
    mockBookingRepo.findBookingById.mockResolvedValue({
      ...fakeBooking,
      status: "PENDING",
    });

    await expect(
      bookingService.confirmPayment(20, adminUser),
    ).rejects.toMatchObject({
      statusCode: 409,
      message: "Payment can only be confirmed for active bookings.",
    });
  });

  it("should throw 409 when booking is CANCELLED", async () => {
    mockPaymentRepo.findPaymentById.mockResolvedValue(fakePayment);
    mockBookingRepo.findBookingById.mockResolvedValue({
      ...fakeBooking,
      status: "CANCELLED",
    });

    await expect(
      bookingService.confirmPayment(20, adminUser),
    ).rejects.toMatchObject({
      statusCode: 409,
      message: "Payment can only be confirmed for active bookings.",
    });
  });

  it("should throw 409 when booking is ENDED", async () => {
    mockPaymentRepo.findPaymentById.mockResolvedValue(fakePayment);
    mockBookingRepo.findBookingById.mockResolvedValue({
      ...fakeBooking,
      status: "ENDED",
    });

    await expect(
      bookingService.confirmPayment(20, adminUser),
    ).rejects.toMatchObject({
      statusCode: 409,
      message: "Payment can only be confirmed for active bookings.",
    });
  });

  it("should confirm payment for CONFIRMED booking and send email", async () => {
    mockPaymentRepo.findPaymentById.mockResolvedValue(fakePayment);
    mockBookingRepo.findBookingById.mockResolvedValue({
      ...fakeBooking,
      status: "CONFIRMED",
    });
    mockPaymentService.markPaymentAsPaid.mockResolvedValue([1]);

    const result = await bookingService.confirmPayment(20, adminUser);

    expect(mockPaymentService.markPaymentAsPaid).toHaveBeenCalledWith(
      fakePayment.id,
      expect.objectContaining({ transaction: fakeTransaction }),
    );
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        email: fakeBooking.user.email,
        subject: expect.stringContaining("Payment Confirmed"),
      }),
    );
    expect(result).toMatchObject({
      payment_id: 20,
      booking_id: fakeBooking.id,
      amount: fakePayment.amount,
      status: "PAID",
    });
  });

  it("should confirm payment for RENEWED booking", async () => {
    mockPaymentRepo.findPaymentById.mockResolvedValue(fakePayment);
    mockBookingRepo.findBookingById.mockResolvedValue({
      ...fakeBooking,
      status: "RENEWED",
    });
    mockPaymentService.markPaymentAsPaid.mockResolvedValue([1]);

    const result = await bookingService.confirmPayment(20, adminUser);

    expect(mockPaymentService.markPaymentAsPaid).toHaveBeenCalled();
    expect(result.status).toBe("PAID");
  });

  it("should not throw if email fails (just logs)", async () => {
    mockPaymentRepo.findPaymentById.mockResolvedValue(fakePayment);
    mockBookingRepo.findBookingById.mockResolvedValue({
      ...fakeBooking,
      status: "CONFIRMED",
    });
    mockPaymentService.markPaymentAsPaid.mockResolvedValue([1]);
    mockSendEmail.mockRejectedValueOnce(new Error("SMTP down"));

    const result = await bookingService.confirmPayment(20, adminUser);

    expect(result.status).toBe("PAID");
  });

  it("should run inside a transaction", async () => {
    mockPaymentRepo.findPaymentById.mockResolvedValue(fakePayment);
    mockBookingRepo.findBookingById.mockResolvedValue({
      ...fakeBooking,
      status: "CONFIRMED",
    });
    mockPaymentService.markPaymentAsPaid.mockResolvedValue([1]);

    await bookingService.confirmPayment(20, adminUser);

    expect(mockSequelize.transaction).toHaveBeenCalledTimes(1);
  });
});
