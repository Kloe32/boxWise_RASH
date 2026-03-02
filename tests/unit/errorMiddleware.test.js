import { jest, describe, it, expect } from "@jest/globals";

const { ApiError } = await import("../../src/utils/ApiError.js");
const { errorHandler } =
  await import("../../src/middlewares/error.middleware.js");

function mockRes() {
  const res = {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
  };
  return res;
}

describe("Error Handler Middleware", () => {
  it("should handle ApiError with correct status and message", () => {
    const err = new ApiError(404, "Booking Not Found!");
    const res = mockRes();
    const next = jest.fn();

    errorHandler(err, {}, res, next);

    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Booking Not Found!");
  });

  it("should default to 500 for generic errors", () => {
    const err = new Error("something broke");
    const res = mockRes();
    const next = jest.fn();

    errorHandler(err, {}, res, next);

    expect(res.statusCode).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Internal Server Error");
  });

  it("should handle ApiError 401 Unauthorized", () => {
    const err = new ApiError(401, "Unauthorized");
    const res = mockRes();
    errorHandler(err, {}, res, jest.fn());

    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBe("Unauthorized");
  });

  it("should handle ApiError 400 Bad Request", () => {
    const err = new ApiError(400, "Validation failed");
    const res = mockRes();
    errorHandler(err, {}, res, jest.fn());

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("Validation failed");
  });
});
