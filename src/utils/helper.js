export function endDate(startDate, months) {
  const start = new Date(startDate);
  const end = new Date(start);

  const day = start.getDate();
  end.setMonth(end.getMonth() + months, 1);

  const lastDayOfTargetMonth = new Date(
    end.getFullYear(),
    end.getMonth() + 1,
    0
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
