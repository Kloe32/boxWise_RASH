import { endDate, generateBookingId } from "../utils/helper.js";
import { db } from "../db/db.js";
const MIN_DURATION_MONTHS = 3;
const MAX_DURATION_MONTHS = 12;
const STATUS_CHOICES = ["RENEWED", "CONFIRMED", "CANCELLED"];

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickOne(items) {
  return items[randomInt(0, items.length - 1)];
}

function randomCancellationDate(start, scheduledEnd) {
  const span = scheduledEnd.getTime() - start.getTime();
  const earlyReturn =
    start.getTime() + Math.max(span * Math.random(), 7 * 24 * 60 * 60 * 1000);
  return new Date(Math.min(earlyReturn, scheduledEnd.getTime()));
}

export async function generateHistoricalBookingData({
  year = new Date().getFullYear() - 1,
} = {}) {
  const [users, units] = await Promise.all([
    db.Users.findAll({ attributes: ["id"], raw: true }),
    db.StorageUnits.findAll({
      include: [
        { model: db.UnitTypes, as: "type", attributes: ["base_price"] },
      ],
      order: [["id", "ASC"]],
    }),
  ]);

  if (users.length === 0 || units.length === 0) {
    console.warn(
      "⚠️ Skipping booking history seed. Ensure users and units exist.",
    );
    return 0;
  }

  const yearStart = new Date(year, 0, 1);
  const nextYearStart = new Date(year + 1, 0, 1);
  const rows = [];

  for (const unit of units) {
    let cursor = new Date(yearStart);

    while (cursor < nextYearStart) {
      const duration = randomInt(MIN_DURATION_MONTHS, MAX_DURATION_MONTHS);
      const leaseStart = new Date(cursor);
      const leaseEnd = endDate(leaseStart, duration);

      if (leaseEnd >= nextYearStart) {
        break;
      }

      const status = pickOne(STATUS_CHOICES);
      const userId = pickOne(users).id;
      const basePrice = Number(unit.type?.base_price ?? 200);
      const finalPrice = Number((basePrice * duration).toFixed(2));
      const actualReturn =
        status === "CANCELLED"
          ? randomCancellationDate(leaseStart, leaseEnd)
          : leaseEnd;

      rows.push({
        id: generateBookingId(unit.id),
        user_id: userId,
        unit_id: unit.id,
        start_date: leaseStart,
        end_date: leaseEnd,
        return_date: actualReturn,
        final_price: finalPrice,
        status,
        created_at: leaseStart,
        updated_at: leaseStart,
      });

      const nextGapDays = randomInt(7, 30);
      cursor = new Date(leaseEnd);
      cursor.setDate(cursor.getDate() + nextGapDays);
    }
  }

  if (!rows.length) {
    console.warn(`⚠️ No bookings generated for year ${year}.`);
    return 0;
  }

  await db.Bookings.bulkCreate(rows, { ignoreDuplicates: true });
  console.log(`✅ Seeded ${rows.length} historical bookings for ${year}`);
  return rows.length;
}
