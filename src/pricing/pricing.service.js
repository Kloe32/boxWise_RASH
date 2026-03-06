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
    const prevYear = new Date().getFullYear() - 1;

    // Precompute month boundaries once
    const months = Array.from({ length: 12 }, (_, m) => {
      const start = monthStart(prevYear, m);
      const end = monthEndExclusive(prevYear, m);
      return {
        start,
        end,
        days: daysBetween(start, end),
        name: start.toLocaleString("en-US", { month: "long" }),
      };
    });

    return sequelize.transaction(async (t) => {
      const [unitCounts, bookings] = await Promise.all([
        storageUnitRepo.getUnitCountsByType({ transaction: t }),
        bookingRepo.getEndedBookingsWithinRange(
          { start: months[0].start, end: months[11].end },
          { transaction: t },
        ),
      ]);

      // occupiedUnitDays[month][typeId] = number of occupied unit-days
      const occupiedUnitDays = Array.from({ length: 12 }, () => new Map());

      for (const b of bookings) {
        const typeId = Number(b.unit.type_id);
        const bStart = new Date(b.start_date);
        const bEnd = new Date(b.end_date);

        for (let m = 0; m < 12; m++) {
          const od = overlapDays(bStart, bEnd, months[m].start, months[m].end);
          if (od > 0) {
            const map = occupiedUnitDays[m];
            map.set(typeId, (map.get(typeId) || 0) + od);
          }
        }
      }

      // Generate monthly multiplier rows
      let rowsWritten = 0;

      for (let m = 0; m < 12; m++) {
        const { start, end, days, name } = months[m];

        for (const [typeId, unitCount] of unitCounts.entries()) {
          const capacityDays = unitCount * days;
          const occDays = occupiedUnitDays[m].get(typeId) || 0;
          const avgOcc = capacityDays === 0 ? 0 : occDays / capacityDays;
          const { multiplier, label } = demandMultiplier(avgOcc);

          await seasonalPricingRepo.upsertSeasonalPricing(
            {
              type_id: typeId,
              year_reference: prevYear,
              start_date: start,
              end_date: new Date(end.getTime() - 1),
              multiplier,
              demand_label: label,
              month_index: name,
            },
            { transaction: t },
          );
          rowsWritten++;
        }
      }

      return { prevYear, rowsWritten };
    });
  },

  // Real-time occupancy per unit type with supply multiplier
  async getCurrentOccupancyByType() {
    const [unitCounts, occupiedCounts] = await Promise.all([
      storageUnitRepo.getUnitCountsByType(),
      storageUnitRepo.getCurrentOccupiedCountsByType(),
    ]);

    return [...unitCounts.entries()].map(([type_id, unit_count]) => {
      const occupied = occupiedCounts.get(type_id) || 0;
      const rate = unit_count === 0 ? 0 : occupied / unit_count;
      const { multiplier, label } = supplyMultiplier(rate);
      return { type_id, unit_count, occupied, rate, multiplier, label };
    });
  },

  async getMultiplierForCurrentMonth(type_id) {
    const month = new Date().toLocaleString("en-US", { month: "long" });
    return seasonalPricingRepo.getMultiplierById(type_id, month);
  },
};
