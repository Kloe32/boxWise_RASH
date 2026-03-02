import { jest, describe, it, expect, beforeEach } from "@jest/globals";

// ── Mocks ────────────────────────────────────────────────────────────
const mockPaymentRepo = {
  createPayment: jest.fn(),
  createPayments: jest.fn(),
  updatePaymentByBookingId: jest.fn(),
  cancelPendingPaymentsAfterDate: jest.fn(),
  updatePaymentById: jest.fn(),
};

jest.unstable_mockModule("../../src/repositories/payment.repo.js", () => ({
  paymentRepo: mockPaymentRepo,
}));

const { paymentService } =
  await import("../../src/services/payment.service.js");

beforeEach(() => jest.clearAllMocks());

// =====================================================================
// createInitialPayment()
// =====================================================================
describe("paymentService.createInitialPayment", () => {
  it("should throw 400 when bookingId is missing", async () => {
    await expect(
      paymentService.createInitialPayment({
        bookingId: null,
        method: "CARD",
        amount: 100,
        dueDate: new Date(),
      }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("should throw 400 when method is missing", async () => {
    await expect(
      paymentService.createInitialPayment({
        bookingId: "BK-1",
        method: null,
        amount: 100,
        dueDate: new Date(),
      }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("should throw 400 when amount is missing", async () => {
    await expect(
      paymentService.createInitialPayment({
        bookingId: "BK-1",
        method: "CARD",
        amount: undefined,
        dueDate: new Date(),
      }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("should create a PENDING payment with correct payload", async () => {
    const dueDate = new Date("2026-04-01");
    mockPaymentRepo.createPayment.mockResolvedValue({ id: 1 });

    await paymentService.createInitialPayment({
      bookingId: "BK-001",
      method: "CARD",
      amount: 250,
      dueDate,
    });

    expect(mockPaymentRepo.createPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        booking_id: "BK-001",
        payment_method: "CARD",
        amount: 250,
        description: "Initial Payment",
        payment_status: "PENDING",
        due_date: dueDate,
      }),
      {},
    );
  });
});

// =====================================================================
// createRecurringPayments()
// =====================================================================
describe("paymentService.createRecurringPayments", () => {
  it("should throw 400 when bookingId is missing", async () => {
    await expect(
      paymentService.createRecurringPayments({
        bookingId: null,
        startDate: new Date(),
        recurringMonths: 3,
        method: "CARD",
        monthlyCharge: 100,
      }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("should throw 400 when startDate is missing", async () => {
    await expect(
      paymentService.createRecurringPayments({
        bookingId: "BK-1",
        startDate: null,
        recurringMonths: 3,
        method: "CARD",
        monthlyCharge: 100,
      }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("should return empty array when recurringMonths <= 0", async () => {
    const result = await paymentService.createRecurringPayments({
      bookingId: "BK-1",
      startDate: new Date(),
      recurringMonths: 0,
      method: "CARD",
      monthlyCharge: 100,
    });
    expect(result).toEqual([]);
    expect(mockPaymentRepo.createPayments).not.toHaveBeenCalled();
  });

  it("should throw 400 when monthlyCharge is invalid", async () => {
    await expect(
      paymentService.createRecurringPayments({
        bookingId: "BK-1",
        startDate: new Date(),
        recurringMonths: 3,
        method: "CARD",
        monthlyCharge: 0,
      }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("should bulk-create correct number of payments", async () => {
    mockPaymentRepo.createPayments.mockResolvedValue([{}, {}, {}]);

    await paymentService.createRecurringPayments({
      bookingId: "BK-1",
      startDate: new Date("2026-01-01"),
      recurringMonths: 3,
      method: "CARD",
      monthlyCharge: 150,
    });

    const call = mockPaymentRepo.createPayments.mock.calls[0];
    expect(call[0]).toHaveLength(3);
    expect(call[0][0].booking_id).toBe("BK-1");
    expect(call[0][0].amount).toBe(150);
    expect(call[0][0].payment_status).toBe("PENDING");
  });
});

// =====================================================================
// createRenewalPayment()
// =====================================================================
describe("paymentService.createRenewalPayment", () => {
  it("should throw 400 when bookingId is missing", async () => {
    await expect(
      paymentService.createRenewalPayment({
        bookingId: null,
        startDate: new Date(),
        receipt: {
          breakdown: {
            initial_payment: 100,
            recurring_months: 1,
            monthly_charge: 50,
          },
          adminFee: 10,
        },
      }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("should throw 400 when startDate is missing", async () => {
    await expect(
      paymentService.createRenewalPayment({
        bookingId: "BK-1",
        startDate: null,
        receipt: {
          breakdown: {
            initial_payment: 100,
            recurring_months: 1,
            monthly_charge: 50,
          },
          adminFee: 10,
        },
      }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("should create initial + recurring renewal payments", async () => {
    mockPaymentRepo.createPayments.mockResolvedValue([{}, {}]);

    await paymentService.createRenewalPayment({
      bookingId: "BK-1",
      startDate: new Date("2026-06-01"),
      receipt: {
        breakdown: {
          initial_payment: 200,
          recurring_months: 2,
          monthly_charge: 150,
        },
        adminFee: 50,
      },
    });

    const call = mockPaymentRepo.createPayments.mock.calls[0];
    // 1 initial + 2 recurring = 3
    expect(call[0]).toHaveLength(3);
    // First payment should be initial_payment minus adminFee
    expect(call[0][0].amount).toBe(150); // 200 - 50
    expect(call[0][0].description).toBe("Renewal Initial Payment");
  });
});

// =====================================================================
// cancelPaymentsByBookingId()
// =====================================================================
describe("paymentService.cancelPaymentsByBookingId", () => {
  it("should call repo to set status FAILED", async () => {
    mockPaymentRepo.updatePaymentByBookingId.mockResolvedValue([1]);
    await paymentService.cancelPaymentsByBookingId("BK-1");
    expect(mockPaymentRepo.updatePaymentByBookingId).toHaveBeenCalledWith(
      "BK-1",
      { payment_status: "FAILED" },
      {},
    );
  });
});

// =====================================================================
// cancelPendingPaymentsAfterDate()
// =====================================================================
describe("paymentService.cancelPendingPaymentsAfterDate", () => {
  it("should throw 400 when bookingId is missing", async () => {
    await expect(
      paymentService.cancelPendingPaymentsAfterDate(null, new Date()),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("should throw 400 when date is missing", async () => {
    await expect(
      paymentService.cancelPendingPaymentsAfterDate("BK-1", null),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("should call repo with correct args", async () => {
    const d = new Date("2026-05-01");
    mockPaymentRepo.cancelPendingPaymentsAfterDate.mockResolvedValue([2]);
    await paymentService.cancelPendingPaymentsAfterDate("BK-1", d);
    expect(mockPaymentRepo.cancelPendingPaymentsAfterDate).toHaveBeenCalledWith(
      "BK-1",
      d,
      {},
    );
  });
});

// =====================================================================
// markPaymentAsPaid()
// =====================================================================
describe("paymentService.markPaymentAsPaid", () => {
  it("should update payment status to PAID with paid_date", async () => {
    mockPaymentRepo.updatePaymentById.mockResolvedValue([1]);
    await paymentService.markPaymentAsPaid(42);
    expect(mockPaymentRepo.updatePaymentById).toHaveBeenCalledWith(
      42,
      expect.objectContaining({
        payment_status: "PAID",
        paid_date: expect.any(Date),
      }),
      {},
    );
  });
});
