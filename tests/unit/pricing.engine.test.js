import { jest, describe, it, expect, beforeAll } from "@jest/globals";

// Mock env before importing the module
jest.unstable_mockModule("../../src/config/env.js", () => ({
  env: {
    ADMIN_FEE: "50",
    GST_RATE: "0.09",
  },
}));

const { calculateUnitPrice, calculateFinalPrice } =
  await import("../../src/pricing/pricing.engine.js");

describe("Pricing Engine", () => {
  // ─── calculateUnitPrice ───────────────────────────────
  describe("calculateUnitPrice", () => {
    it("should multiply base price by both multipliers", () => {
      const result = calculateUnitPrice({
        basePrice: 100,
        seasonalMultiplier: 1.2,
        supplyMultiplier: 1.05,
      });
      expect(result).toBe(126); // 100 * 1.2 * 1.05 = 126
    });

    it("should return 0 when base price is 0", () => {
      const result = calculateUnitPrice({
        basePrice: 0,
        seasonalMultiplier: 1.5,
        supplyMultiplier: 1.1,
      });
      expect(result).toBe(0);
    });

    it("should round to 2 decimal places", () => {
      const result = calculateUnitPrice({
        basePrice: 99.99,
        seasonalMultiplier: 1.333,
        supplyMultiplier: 1.01,
      });
      // 99.99 * 1.333 * 1.01 = 134.5465...
      expect(result.toString().split(".")[1]?.length || 0).toBeLessThanOrEqual(
        2,
      );
    });

    it("should handle multiplier of 1.0 (no change)", () => {
      const result = calculateUnitPrice({
        basePrice: 200,
        seasonalMultiplier: 1.0,
        supplyMultiplier: 1.0,
      });
      expect(result).toBe(200);
    });

    it("should handle discount multiplier (<1)", () => {
      const result = calculateUnitPrice({
        basePrice: 100,
        seasonalMultiplier: 1.0,
        supplyMultiplier: 0.9,
      });
      expect(result).toBe(90);
    });
  });

  // ─── calculateFinalPrice ──────────────────────────────
  describe("calculateFinalPrice", () => {
    // Using mocked env: ADMIN_FEE=50, GST_RATE=0.09

    it("should calculate correct totals for a standard 3-month booking", () => {
      const result = calculateFinalPrice(100, 3);

      // subtotal = 100 * 3 = 300
      expect(result.subtotal).toBe(300);
      // gst = 300 * 0.09 = 27
      expect(result.gst).toBe(27);
      // total = 300 + 27 + 50 = 377
      expect(result.total).toBe(377);
      // admin fee
      expect(result.adminFee).toBe(50);
      // gst rate
      expect(result.gst_rate).toBe("9%");
      // initial = 100 (1 month) + 50 (admin) + 27 (gst) = 177
      expect(Number(result.breakdown.initial_payment)).toBe(177);
      // recurring months = 3 - 1 = 2
      expect(result.breakdown.recurring_months).toBe(2);
      // monthly charge = unit price
      expect(Number(result.breakdown.monthly_charge)).toBe(100);
    });

    it("should handle 1-month booking (no recurring payments)", () => {
      const result = calculateFinalPrice(150, 1);

      expect(result.subtotal).toBe(150);
      expect(result.gst).toBe(13.5); // 150 * 0.09
      expect(result.total).toBe(213.5); // 150 + 13.5 + 50
      expect(Number(result.breakdown.initial_payment)).toBe(213.5); // all upfront
      expect(result.breakdown.recurring_months).toBe(0);
    });

    it("should handle 0 duration", () => {
      const result = calculateFinalPrice(100, 0);

      expect(result.subtotal).toBe(0);
      expect(result.gst).toBe(0);
      expect(result.total).toBe(50); // only admin fee
      expect(Number(result.breakdown.initial_payment)).toBe(50);
      expect(result.breakdown.recurring_months).toBe(0);
    });

    it("should handle negative duration as 0", () => {
      const result = calculateFinalPrice(100, -5);

      expect(result.subtotal).toBe(0);
      expect(result.total).toBe(50);
      expect(result.breakdown.recurring_months).toBe(0);
    });

    it("should handle large duration (12 months)", () => {
      const result = calculateFinalPrice(200, 12);

      // subtotal = 200 * 12 = 2400
      expect(result.subtotal).toBe(2400);
      // gst = 2400 * 0.09 = 216
      expect(result.gst).toBe(216);
      // total = 2400 + 216 + 50 = 2666
      expect(result.total).toBe(2666);
      // initial = 200 + 50 + 216 = 466
      expect(Number(result.breakdown.initial_payment)).toBe(466);
      // recurring = 12 - 1 = 11
      expect(result.breakdown.recurring_months).toBe(11);
    });

    it("should return string types for initial_payment and monthly_charge", () => {
      const result = calculateFinalPrice(100, 3);
      expect(typeof result.breakdown.initial_payment).toBe("string");
      expect(typeof result.breakdown.monthly_charge).toBe("string");
    });
  });
});
