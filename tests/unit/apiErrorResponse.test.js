import { describe, it, expect } from "@jest/globals";

const { ApiError } = await import("../../src/utils/ApiError.js");
const { ApiResponse } = await import("../../src/utils/ApiResponse.js");

describe("ApiError", () => {
  it("should create an error with statusCode and message", () => {
    const error = new ApiError(404, "Not Found");
    expect(error.statusCode).toBe(404);
    expect(error.message).toBe("Not Found");
    expect(error.success).toBe(false);
    expect(error.data).toBeNull();
  });

  it("should use default message when not provided", () => {
    const error = new ApiError(500);
    expect(error.message).toBe("Something went wrong");
  });

  it("should be an instance of Error", () => {
    const error = new ApiError(400, "Bad Request");
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ApiError);
  });

  it("should include errors array when provided", () => {
    const errors = [{ field: "email", msg: "required" }];
    const error = new ApiError(422, "Validation Error", errors);
    expect(error.errors).toEqual(errors);
  });

  it("should have a stack trace", () => {
    const error = new ApiError(500, "Server Error");
    expect(error.stack).toBeDefined();
    expect(error.stack.length).toBeGreaterThan(0);
  });
});

describe("ApiResponse", () => {
  it("should create a success response (statusCode < 400)", () => {
    const response = new ApiResponse(200, { id: 1 }, "OK");
    expect(response.statusCode).toBe(200);
    expect(response.data).toEqual({ id: 1 });
    expect(response.message).toBe("OK");
    expect(response.success).toBe(true);
  });

  it("should create a failure response (statusCode >= 400)", () => {
    const response = new ApiResponse(404, null, "Not Found");
    expect(response.success).toBe(false);
  });

  it("should default message to 'Success'", () => {
    const response = new ApiResponse(200, []);
    expect(response.message).toBe("Success");
  });

  it("should mark 399 as success and 400 as failure", () => {
    expect(new ApiResponse(399, null).success).toBe(true);
    expect(new ApiResponse(400, null).success).toBe(false);
  });
});
