import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import supertest from "supertest";

// ── Mock the booking service ─────────────────────────────────────────
const mockBookingService = {
  createBooking: jest.fn(),
  listBookings: jest.fn(),
  confirmBooking: jest.fn(),
  cancelBooking: jest.fn(),
  requestEarlyReturn: jest.fn(),
  approveEarlyReturnRequest: jest.fn(),
  confirmBookingEnding: jest.fn(),
  getPendingBookingsWithDate: jest.fn(),
  requestRenewal: jest.fn(),
  approveRenewal: jest.fn(),
  confirmPayment: jest.fn(),
};

// Mock requireAuth to inject a fake user
const adminUser = {
  id: 1,
  email: "admin@test.com",
  full_name: "Admin",
  role: "ADMIN",
};

jest.unstable_mockModule("../../src/services/booking.service.js", () => ({
  bookingService: mockBookingService,
}));

jest.unstable_mockModule("../../src/middlewares/verifyToken.js", () => ({
  requireAuth: (req, _res, next) => {
    req.user = adminUser;
    next();
  },
}));

const { default: bookingRouter } =
  await import("../../src/routes/booking.route.js");
const { createApp } = await import("../helpers/createApp.js");

const app = createApp({ bookingRouter });
const request = supertest(app);

beforeEach(() => jest.clearAllMocks());

// =====================================================================
// POST /api/v1/bookings
// =====================================================================
describe("POST /api/v1/bookings/create", () => {
  it("should return 200 on successful booking", async () => {
    mockBookingService.createBooking.mockResolvedValue({
      booking: { id: "BK-1" },
      receipt: { total: 350 },
    });

    const res = await request.post("/api/v1/bookings/create").send({
      unit_id: 1,
      start_date: "2026-04-01",
      duration: 3,
      method: "CARD",
    });

    expect(res.status).toBe(200);
    expect(res.body.data.booking.id).toBe("BK-1");
    expect(mockBookingService.createBooking).toHaveBeenCalledWith(
      expect.objectContaining({ unit_id: 1 }),
      adminUser,
    );
  });

  it("should return error when service throws", async () => {
    const { ApiError } = await import("../../src/utils/ApiError.js");
    mockBookingService.createBooking.mockRejectedValue(
      new ApiError(400, "Credentials missing"),
    );

    const res = await request.post("/api/v1/bookings/create").send({});
    expect(res.status).toBe(400);
  });
});

// =====================================================================
// GET /api/v1/bookings
// =====================================================================
describe("GET /api/v1/bookings", () => {
  it("should return list of bookings", async () => {
    const bookings = [{ id: "BK-1" }, { id: "BK-2" }];
    mockBookingService.listBookings.mockResolvedValue(bookings);

    const res = await request.get("/api/v1/bookings");
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.message).toMatch(/2 Fetched/);
  });
});

// =====================================================================
// POST /api/v1/bookings/confirm/:id
// =====================================================================
describe("POST /api/v1/bookings/confirm/:id", () => {
  it("should return 200 on confirmation", async () => {
    mockBookingService.confirmBooking.mockResolvedValue({
      updated: { status: "CONFIRMED" },
    });

    const res = await request.post("/api/v1/bookings/confirm/BK-1");
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/confirmed/i);
  });
});

// =====================================================================
// POST /api/v1/bookings/cancel/:id
// =====================================================================
describe("POST /api/v1/bookings/cancel/:id", () => {
  it("should return 200 on cancellation", async () => {
    mockBookingService.cancelBooking.mockResolvedValue({ cancelled: true });

    const res = await request.post("/api/v1/bookings/cancel/BK-1");
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/status updated/i);
  });
});

// =====================================================================
// POST /api/v1/bookings/request-early-return/:id
// =====================================================================
describe("POST /api/v1/bookings/request-early-return/:id", () => {
  it("should return 200 on success", async () => {
    mockBookingService.requestEarlyReturn.mockResolvedValue({
      return_date: "2026-05-01",
    });

    const res = await request
      .post("/api/v1/bookings/request-early-return/BK-1")
      .send({ requested_date: "2026-05-01" });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/early return requested/i);
  });
});

// =====================================================================
// POST /api/v1/bookings/approve-early-return/:id
// =====================================================================
describe("POST /api/v1/bookings/approve-early-return/:id", () => {
  it("should return 200 on approval", async () => {
    mockBookingService.approveEarlyReturnRequest.mockResolvedValue({
      approved: true,
    });

    const res = await request.post(
      "/api/v1/bookings/approve-early-return/BK-1",
    );
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/early return approved/i);
  });
});

// =====================================================================
// POST /api/v1/bookings/confirm-booking-ending/:id
// =====================================================================
describe("POST /api/v1/bookings/confirm-booking-ending/:id", () => {
  it("should return 200 on ending confirmation", async () => {
    mockBookingService.confirmBookingEnding.mockResolvedValue({
      status: "ENDED",
    });

    const res = await request.post(
      "/api/v1/bookings/confirm-booking-ending/BK-1",
    );
    expect(res.status).toBe(200);
  });
});

// =====================================================================
// GET /api/v1/bookings/pending-with-date
// =====================================================================
describe("GET /api/v1/bookings/pending-with-date", () => {
  it("should return pending stats", async () => {
    const stats = { totalPending: [], todayPending: 1, yesterdayPending: 0 };
    mockBookingService.getPendingBookingsWithDate.mockResolvedValue(stats);

    const res = await request.get("/api/v1/bookings/pending-with-date");
    expect(res.status).toBe(200);
  });
});

// =====================================================================
// POST /api/v1/bookings/request-renewal/:id
// =====================================================================
describe("POST /api/v1/bookings/request-renewal/:id", () => {
  it("should return 200 on renewal request", async () => {
    mockBookingService.requestRenewal.mockResolvedValue({
      renewal_status: "REQUESTED",
    });

    const res = await request
      .post("/api/v1/bookings/request-renewal/BK-1")
      .send({ additional_duration: "3" });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/renewal requested/i);
    expect(mockBookingService.requestRenewal).toHaveBeenCalledWith(
      "BK-1",
      3,
      adminUser,
    );
  });
});

// =====================================================================
// POST /api/v1/bookings/approve-renewal/:id
// =====================================================================
describe("POST /api/v1/bookings/approve-renewal/:id", () => {
  it("should return 200 on renewal approval", async () => {
    mockBookingService.approveRenewal.mockResolvedValue({
      renewed: true,
      newPayments: [],
    });

    const res = await request.post("/api/v1/bookings/approve-renewal/BK-1");
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/renewal approved/i);
  });
});

// =====================================================================
// POST /api/v1/bookings/confirm-payment/:id
// =====================================================================
describe("POST /api/v1/bookings/confirm-payment/:id", () => {
  it("should return 200 on payment confirmation", async () => {
    mockBookingService.confirmPayment.mockResolvedValue({
      payment_id: 20,
      booking_id: "BK-1",
      amount: "100.00",
      status: "PAID",
    });

    const res = await request.post("/api/v1/bookings/confirm-payment/20");
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/payment confirmed/i);
    expect(res.body.data.status).toBe("PAID");
    expect(mockBookingService.confirmPayment).toHaveBeenCalledWith(
      "20",
      adminUser,
    );
  });

  it("should return error when service throws", async () => {
    const { ApiError } = await import("../../src/utils/ApiError.js");
    mockBookingService.confirmPayment.mockRejectedValue(
      new ApiError(404, "Payment Not Found!"),
    );

    const res = await request.post("/api/v1/bookings/confirm-payment/999");
    expect(res.status).toBe(404);
  });
});
