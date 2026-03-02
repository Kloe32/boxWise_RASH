import { jest, describe, it, expect } from "@jest/globals";

const {
  endDate,
  generateBookingId,
  formatDate,
  demandMultiplier,
  supplyMultiplier,
  daysBetween,
  overlapDays,
  monthStart,
  monthEndExclusive,
} = await import("../../src/utils/helper.js");

describe("Helper Utilities", () => {
  // ─── endDate ──────────────────────────────────────────
  describe("endDate", () => {
    it("should add months correctly", () => {
      const result = endDate("2026-01-15", 3);
      expect(result.getFullYear()).toBe(2026);
      expect(result.getMonth()).toBe(3); // April (0-indexed)
      expect(result.getDate()).toBe(15);
    });

    it("should handle end-of-month overflow (Jan 31 + 1 month → Feb 28)", () => {
      const result = endDate("2026-01-31", 1);
      expect(result.getMonth()).toBe(1); // February
      expect(result.getDate()).toBe(28); // clamped to last day of Feb
    });

    it("should handle leap year (Jan 31 + 1 month in 2028 → Feb 29)", () => {
      const result = endDate("2028-01-31", 1);
      expect(result.getMonth()).toBe(1); // February
      expect(result.getDate()).toBe(29); // leap year
    });

    it("should handle adding 12 months (full year)", () => {
      const result = endDate("2026-03-10", 12);
      expect(result.getFullYear()).toBe(2027);
      expect(result.getMonth()).toBe(2); // March
      expect(result.getDate()).toBe(10);
    });

    it("should handle 0 months (same date)", () => {
      const result = endDate("2026-06-15", 0);
      expect(result.getMonth()).toBe(5); // June
      expect(result.getDate()).toBe(15);
    });
  });

  // ─── generateBookingId ────────────────────────────────
  describe("generateBookingId", () => {
    it("should return correct format BK-YYYYMMDD-Uxx-xxxx", () => {
      const id = generateBookingId(5);
      expect(id).toMatch(/^BK-\d{8}-U\d{2,}-[A-Z0-9]{4}$/);
    });

    it("should pad single-digit unit IDs", () => {
      const id = generateBookingId(3);
      expect(id).toContain("-U03-");
    });

    it("should handle double-digit unit IDs", () => {
      const id = generateBookingId(12);
      expect(id).toContain("-U12-");
    });

    it("should generate unique IDs on consecutive calls", () => {
      const id1 = generateBookingId(1);
      const id2 = generateBookingId(1);
      // Random suffix should differ (extremely unlikely to collide)
      expect(id1).not.toBe(id2);
    });
  });

  // ─── formatDate ───────────────────────────────────────
  describe("formatDate", () => {
    it("should format a valid date in en-US short format", () => {
      const result = formatDate("2026-03-15");
      // Mar 15, 2026
      expect(result).toMatch(/Mar\s+15,\s+2026/);
    });

    it('should return "N/A" for null', () => {
      expect(formatDate(null)).toBe("N/A");
    });

    it('should return "N/A" for undefined', () => {
      expect(formatDate(undefined)).toBe("N/A");
    });

    it("should handle Date objects", () => {
      const result = formatDate(new Date(2026, 11, 25)); // Dec 25, 2026
      expect(result).toMatch(/Dec\s+25,\s+2026/);
    });
  });

  // ─── demandMultiplier ─────────────────────────────────
  describe("demandMultiplier", () => {
    it("should return PEAK (1.25) for occupancy >= 80%", () => {
      const result = demandMultiplier(0.85);
      expect(result.multiplier).toBe(1.25);
      expect(result.label).toContain("PEAK");
    });

    it("should return PEAK for exactly 80%", () => {
      expect(demandMultiplier(0.8).multiplier).toBe(1.25);
    });

    it("should return MID (1.1) for occupancy 50–79%", () => {
      const result = demandMultiplier(0.65);
      expect(result.multiplier).toBe(1.1);
      expect(result.label).toContain("MID");
    });

    it("should return MID for exactly 50%", () => {
      expect(demandMultiplier(0.5).multiplier).toBe(1.1);
    });

    it("should return LOW (1.0) for occupancy < 50%", () => {
      const result = demandMultiplier(0.3);
      expect(result.multiplier).toBe(1.0);
      expect(result.label).toContain("LOW");
    });

    it("should return LOW for 0%", () => {
      expect(demandMultiplier(0).multiplier).toBe(1.0);
    });
  });

  // ─── supplyMultiplier ─────────────────────────────────
  describe("supplyMultiplier", () => {
    it("should return TIGHT (1.05) for occupancy >= 50%", () => {
      const result = supplyMultiplier(0.6);
      expect(result.multiplier).toBe(1.05);
      expect(result.label).toContain("TIGHT");
    });

    it("should return TIGHT for exactly 50%", () => {
      expect(supplyMultiplier(0.5).multiplier).toBe(1.05);
    });

    it("should return NORMAL (1.0) for occupancy 40–49%", () => {
      const result = supplyMultiplier(0.45);
      expect(result.multiplier).toBe(1.0);
      expect(result.label).toContain("NORMAL");
    });

    it("should return NORMAL for exactly 40%", () => {
      expect(supplyMultiplier(0.4).multiplier).toBe(1.0);
    });

    it("should return LOW (0.9) for occupancy < 40%", () => {
      const result = supplyMultiplier(0.2);
      expect(result.multiplier).toBe(0.9);
      expect(result.label).toContain("LOW");
    });
  });

  // ─── daysBetween ──────────────────────────────────────
  describe("daysBetween", () => {
    it("should return correct days between two dates", () => {
      const a = new Date("2026-01-01");
      const b = new Date("2026-01-10");
      expect(daysBetween(a, b)).toBe(9);
    });

    it("should return 0 for same date", () => {
      const d = new Date("2026-06-15");
      expect(daysBetween(d, d)).toBe(0);
    });

    it("should return 0 when b is before a (no negative)", () => {
      const a = new Date("2026-03-10");
      const b = new Date("2026-03-01");
      expect(daysBetween(a, b)).toBe(0);
    });

    it("should handle month boundaries", () => {
      const a = new Date("2026-01-28");
      const b = new Date("2026-02-03");
      expect(daysBetween(a, b)).toBe(6);
    });
  });

  // ─── overlapDays ──────────────────────────────────────
  describe("overlapDays", () => {
    it("should return overlap days for overlapping ranges", () => {
      const result = overlapDays(
        new Date("2026-01-01"),
        new Date("2026-01-10"),
        new Date("2026-01-05"),
        new Date("2026-01-15"),
      );
      expect(result).toBe(5); // Jan 5 → Jan 10
    });

    it("should return 0 for non-overlapping ranges", () => {
      const result = overlapDays(
        new Date("2026-01-01"),
        new Date("2026-01-05"),
        new Date("2026-01-10"),
        new Date("2026-01-15"),
      );
      expect(result).toBe(0);
    });

    it("should return 0 when ranges touch at boundary (exclusive end)", () => {
      const result = overlapDays(
        new Date("2026-01-01"),
        new Date("2026-01-05"),
        new Date("2026-01-05"),
        new Date("2026-01-10"),
      );
      expect(result).toBe(0);
    });

    it("should handle complete containment", () => {
      const result = overlapDays(
        new Date("2026-01-01"),
        new Date("2026-01-31"),
        new Date("2026-01-10"),
        new Date("2026-01-20"),
      );
      expect(result).toBe(10); // Jan 10 → Jan 20
    });
  });

  // ─── monthStart / monthEndExclusive ───────────────────
  describe("monthStart and monthEndExclusive", () => {
    it("monthStart returns first day of the month", () => {
      const result = monthStart(2026, 2); // March
      expect(result.getDate()).toBe(1);
      expect(result.getMonth()).toBe(2);
    });

    it("monthEndExclusive returns first day of next month", () => {
      const result = monthEndExclusive(2026, 2); // March → April 1st
      expect(result.getDate()).toBe(1);
      expect(result.getMonth()).toBe(3); // April
    });

    it("monthEndExclusive handles December → next year January", () => {
      const result = monthEndExclusive(2026, 11); // December → Jan 1 2027
      expect(result.getFullYear()).toBe(2027);
      expect(result.getMonth()).toBe(0);
      expect(result.getDate()).toBe(1);
    });
  });
});
