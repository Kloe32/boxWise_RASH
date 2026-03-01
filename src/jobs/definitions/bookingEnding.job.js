import { vacatingNoticeMailgenContent, sendEmail } from "../../utils/mail.js";
import { bookingRepo } from "../../repositories/booking.repo.js";
import { sequelize } from "../../db/sequelize.js";

const DAYS_BEFORE_END = 2;

/**
 * Runs daily. Finds CONFIRMED / RENEWED bookings whose end_date is
 * exactly 2 days from now, where no renewal has been requested/approved
 * and no early return date is set. Flags them as VACATING and
 * notifies the tenant via email.
 */
export async function bookingEnding() {
  const now = new Date();
  // Target date = today + 2 days (date-only, no time component)
  const target = new Date(now);
  target.setDate(target.getDate() + DAYS_BEFORE_END);
  const targetDateStr = target.toISOString().slice(0, 10); // "YYYY-MM-DD"

  return sequelize.transaction(async (t) => {
    const bookings = await bookingRepo.findApproachingEndBookings(
      targetDateStr,
      { transaction: t },
    );

    if (bookings.length === 0) {
      return { flagged: 0, notified: 0 };
    }

    const bookingIds = bookings.map((b) => b.id);

    // Bulk-update to VACATING
    const [flaggedCount] = await bookingRepo.bulkVacate(bookingIds, {
      transaction: t,
    });

    // Send vacating-notice emails (best-effort, don't roll back on mail failure)
    let notified = 0;
    for (const booking of bookings) {
      try {
        const emailContent = vacatingNoticeMailgenContent({
          customerName: booking.user.full_name,
          unitLabel: booking.unit.unit_number,
          endDate: new Date(booking.end_date),
        });

        await sendEmail({
          email: booking.user.email,
          subject: `Your booking for ${booking.unit.unit_number} is ending soon – Action Required`,
          mailgenContent: emailContent,
        });
        notified++;
      } catch (err) {
        console.error(
          `⚠️ Failed to send vacating email for booking ${booking.id}:`,
          err.message,
        );
      }
    }

    return { flagged: flaggedCount, notified };
  });
}

// bookingEnding()
//   .then((result) => {
//     console.log(
//       `Booking Ending Job Result: ${result.flagged} bookings flagged as VACATING, ${result.notified} emails sent`,
//     );
//   })
//   .catch((e) => {
//     console.error("Booking Ending Job failed:", e);
//   });
