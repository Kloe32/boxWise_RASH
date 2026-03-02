import { jest, describe, it, expect, beforeEach } from "@jest/globals";

// ── Mocks ────────────────────────────────────────────────────────────
const mockBookingRepo = {
  findBookingsWithPaymentDue: jest.fn(),
};

const mockSendEmail = jest.fn();

jest.unstable_mockModule("../../src/repositories/booking.repo.js", () => ({
  bookingRepo: mockBookingRepo,
}));
jest.unstable_mockModule("../../src/utils/mail.js", () => ({
  sendEmail: mockSendEmail,
  paymentDueSoonReminderMailgenContent: jest.fn(() => "reminder-content"),
}));

const { paymentDue } = await import(
  "../../src/jobs/definitions/paymentDue.job.js"
);

beforeEach(() => {
  jest.clearAllMocks();
  mockSendEmail.mockResolvedValue(undefined);
});

// ── Helper to build a booking with a payment due N days from now ─────
function makeBookingWithDue(id, daysFromNow) {
  const due = new Date();
  due.setDate(due.getDate() + daysFromNow);
  due.setHours(0, 0, 0, 0);
  return {
    id,
    user: { full_name: "Test", email: "test@test.com" },
    unit: { unit_number: "A-01" },
    payments: [
      {
        id: 100,
        due_date: due.toISOString(),
        amount: 150,
        description: "Monthly Payment",
        payment_status: "PENDING",
      },
    ],
  };
}

// =====================================================================
describe("paymentDue job", () => {
  it("should return { bookingsScanned: 0, remindersSent: 0 } when no bookings", async () => {
    mockBookingRepo.findBookingsWithPaymentDue.mockResolvedValue([]);

    const result = await paymentDue();

    expect(result).toEqual({ bookingsScanned: 0, remindersSent: 0 });
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("should send reminder for payment due within 3 days", async () => {
    const booking = makeBookingWithDue("BK-1", 2); // due in 2 days
    mockBookingRepo.findBookingsWithPaymentDue.mockResolvedValue([booking]);

    const result = await paymentDue();

    expect(result).toEqual({ bookingsScanned: 1, remindersSent: 1 });
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "test@test.com",
        subject: expect.stringContaining("Payment Reminder"),
      }),
    );
  });

  it("should send reminder for payment due today (0 days)", async () => {
    const booking = makeBookingWithDue("BK-1", 0);
    mockBookingRepo.findBookingsWithPaymentDue.mockResolvedValue([booking]);

    const result = await paymentDue();

    expect(result.remindersSent).toBe(1);
  });

  it("should skip bookings with no pending payments", async () => {
    const booking = {
      id: "BK-1",
      user: { full_name: "Test", email: "test@test.com" },
      unit: { unit_number: "A-01" },
      payments: [],
    };
    mockBookingRepo.findBookingsWithPaymentDue.mockResolvedValue([booking]);

    const result = await paymentDue();

    expect(result.remindersSent).toBe(0);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("should not crash if email fails — count stays 0", async () => {
    const booking = makeBookingWithDue("BK-1", 1);
    mockBookingRepo.findBookingsWithPaymentDue.mockResolvedValue([booking]);
    mockSendEmail.mockRejectedValue(new Error("SMTP down"));

    const result = await paymentDue();

    expect(result.bookingsScanned).toBe(1);
    expect(result.remindersSent).toBe(0); // failed
  });

  it("should handle multiple bookings — some send, some fail", async () => {
    const b1 = makeBookingWithDue("BK-1", 1);
    const b2 = makeBookingWithDue("BK-2", 2);
    mockBookingRepo.findBookingsWithPaymentDue.mockResolvedValue([b1, b2]);
    mockSendEmail
      .mockResolvedValueOnce(undefined) // BK-1 succeeds
      .mockRejectedValueOnce(new Error("fail")); // BK-2 fails

    const result = await paymentDue();

    expect(result.bookingsScanned).toBe(2);
    expect(result.remindersSent).toBe(1);
  });
});
