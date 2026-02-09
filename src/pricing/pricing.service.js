import { sequelize } from "../db/sequelize.js";
import { seasonalPricingRepo } from "../repositories/seasonalPricing.repo.js";
import { storageUnitRepo } from "../repositories/storage_unit.repo.js";
import { bookingRepo } from "../repositories/booking.repo.js";
import {
  demandMultiplier,
  supplyMultiplier,
  monthStart,
  monthEndExclusive,
  daysBetween,
  overlapDays,
} from "../utils/helper.js";

export const pricingService = {
  async generateSeasonalPricingPreviousYear() {
    const now = new Date();
    const prevYear = now.getFullYear() - 1;

    const yearStart = new Date(prevYear, 0, 1);
    const yearEnd = new Date(prevYear + 1, 0, 1); // exclusive

    return sequelize.transaction(async (t) => {
      const unitCounts = await storageUnitRepo.getUnitCountsByType({
        transaction: t,
      });

      // 1) pull ENDED bookings that overlap prev year
      const bookings = await bookingRepo.getEndedBookingsWithinRange(
        { start: yearStart, end: yearEnd },
        { transaction: t },
      );

      // 2) occupiedUnitDays[month][typeId] = number
      const occupiedUnitDays = Array.from({ length: 12 }, () => new Map());

      for (const b of bookings) {
        const typeId = Number(b.unit.type_id);
        const bStart = new Date(b.start_date);
        const bEnd = new Date(b.end_date);

        for (let m = 0; m < 12; m++) {
          const mStart = monthStart(prevYear, m);
          const mEnd = monthEndExclusive(prevYear, m);
          const od = overlapDays(bStart, bEnd, mStart, mEnd);

          if (od > 0) {
            const map = occupiedUnitDays[m];
            map.set(typeId, (map.get(typeId) || 0) + od);
          }
        }
      }

      // 3) generate monthly multiplier rows
      let rowsWritten = 0;

      for (let m = 0; m < 12; m++) {
        const mStart = monthStart(prevYear, m);
        const mEndEx = monthEndExclusive(prevYear, m);
        const daysInMonth = daysBetween(mStart, mEndEx);
        const monthName = mStart.toLocaleString("en-US", { month: "long" });

        for (const [typeId, unitCount] of unitCounts.entries()) {
          const capacityDays = unitCount * daysInMonth;
          const occDays = occupiedUnitDays[m].get(typeId) || 0;
          const avgOcc = capacityDays === 0 ? 0 : occDays / capacityDays;

          const rule = demandMultiplier(avgOcc);

          // store month rule in seasonal_pricing
          await seasonalPricingRepo.upsertSeasonalPricing(
            {
              type_id: typeId,
              year_reference: prevYear,
              start_date: mStart,
              end_date: new Date(mEndEx.getTime() - 1),
              multiplier: rule.multiplier,
              demand_label: rule.label,
              month_index: monthName,
            },
            { transaction: t },
          );

          rowsWritten++;
        }
      }

      return { prevYear, rowsWritten };
    });
  },

  // Optional helper for real-time occupancy
  async getCurrentOccupancyByType() {
    const unitCounts = await storageUnitRepo.getUnitCountsByType();
    const active = await storageUnitRepo.getCurrentOccupiedCountsByType();

    // convert to occupancy rate + multiplier
    const result = [];
    for (const [type_id, unit_count] of unitCounts.entries()) {
      const occupied = active.get(type_id) || 0;
      const rate = unit_count === 0 ? 0 : occupied / unit_count;
      const rule = supplyMultiplier(rate);

      result.push({
        type_id,
        unit_count,
        occupied,
        rate,
        multiplier: rule.multiplier,
        label: rule.label,
      });
    }
    return result;
  },

  async getMultiplierForCurrentMonth(type_id) {
    const now = new Date();
    const month = now.toLocaleDateString("en-US", { month: "long" });

    const result = await seasonalPricingRepo.getMultiplierById(type_id, month);

    return result;
  },
};

const start = async () => {
  const result = await pricingService.getMultiplierForCurrentMonth(1);
  console.log("resulttt", result);
};

start();
