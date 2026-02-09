export function endDate(startDate, months) {
  const start = new Date(startDate);
  const end = new Date(start);

  const day = start.getDate();
  end.setMonth(end.getMonth() + months, 1);

  const lastDayOfTargetMonth = new Date(
    end.getFullYear(),
    end.getMonth() + 1,
    0,
  ).getDate();

  end.setDate(Math.min(day, lastDayOfTargetMonth));
  return end;
}

import { format } from "date-fns";

export function generateBookingId(unitId) {
  const today = format(new Date(), "yyyyMMdd"); // 20260131
  const paddedUnit = String(unitId).padStart(2, "0"); // 003
  const random = Math.random().toString(36).slice(2, 6).toUpperCase(); // 4 chars

  return `BK-${today}-U${paddedUnit}-${random}`;
}

// ---------- rules ----------
export function demandMultiplier(avgOcc) {
  if (avgOcc >= 0.8)
    return { multiplier: 1.25, label: "PEAK (80%+ last year)" };
  if (avgOcc >= 0.5)
    return { multiplier: 1.1, label: "MID (50–79% last year)" };
  return { multiplier: 1.0, label: "LOW (<50% last year)" };
}

export function supplyMultiplier(currOcc) {
  if (currOcc >= 0.5)
    return { multiplier: 1.05, label: "SUPPLY TIGHT (50%+ now)" };
  if (currOcc >= 0.4)
    return { multiplier: 1.0, label: "SUPPLY NORMAL (40%+ now)" };
  if (currOcc < 0.4) return { multiplier: 0.9, label: "SUPPLY LOW (<40% now)" };
  return { multiplier: 1.0, label: "SUPPLY NORMAL" };
}

// ---------- date helpers ----------
export function monthStart(year, monthIndex) {
  return new Date(year, monthIndex, 1);
}

// exclusive month end: first day of next month
export function monthEndExclusive(year, monthIndex) {
  return new Date(year, monthIndex + 1, 1);
}

export function daysBetween(a, b) {
  const ms = b.getTime() - a.getTime();
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

// overlap days between [aStart, aEnd) and [bStart, bEnd)
export function overlapDays(aStart, aEnd, bStart, bEnd) {
  const start = new Date(Math.max(aStart.getTime(), bStart.getTime()));
  const end = new Date(Math.min(aEnd.getTime(), bEnd.getTime()));
  if (start >= end) return 0;
  return daysBetween(start, end);
}
