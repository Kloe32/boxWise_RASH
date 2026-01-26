import { sequelize } from "../../db/sequelize.js";
import { bookingRepo } from "../../repositories/booking.repo.js";
import { storageUnitRepo } from "../../repositories/storage_unit.repo.js";
// 5 days in ms
const HOLD_DAYS = 5;
const HOLD_MS = HOLD_DAYS * 24 * 60 * 60 * 1000;
// * 24 * 60 * 60
export async function releaseExpiredBookings() {
  const cutoff = new Date(Date.now() - HOLD_MS);
  // Run everything in a transaction to keep DB consistent
  return sequelize.transaction(async (t) => {
    // find expired pending bookings

    const expiredBookings = await bookingRepo.findExpiredPending(cutoff, {
      transaction: t,
    });

    if (expiredBookings.length === 0) {
      return { cancelled: 0 };
    }

    const bookingIds = expiredBookings.map((b) => b.id);
    const unitIds = expiredBookings.map((b) => b.unit_id);

    // cancel bookings (only if still pending — makes it idempotent + race-safe)
    const [cancelledCount] = await bookingRepo.bulkCancel(bookingIds, {
      transaction: t,
    });

    // release units (only if they are currently reserved/pending)
    await storageUnitRepo.releaseExpiredUnits(unitIds, { transaction: t });

    return { cancelled: cancelledCount };
  });
}
