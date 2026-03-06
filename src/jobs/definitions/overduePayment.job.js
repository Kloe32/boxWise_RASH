import { sequelize } from "../../db/sequelize.js";
import { bookingRepo } from "../../repositories/booking.repo.js";
import { paymentRepo } from "../../repositories/payment.repo.js";
import { storageUnitRepo } from "../../repositories/storage_unit.repo.js";
import { overduePaymentMailgenContent, sendEmail } from "../../utils/mail.js";

// Grace period: 7 days after due date
const GRACE_DAYS = 7;
const GRACE_MS = GRACE_DAYS * 24 * 60 * 60 * 1000;

export async function overduePayment() {
  // cutoff = 7 days ago — any PENDING payment due before this is overdue
  const cutoff = new Date(Date.now() - GRACE_MS);

  return sequelize.transaction(async (t) => {
    const overdueBookings = await bookingRepo.findBookingsWithOverduePayments(
      cutoff,
      { transaction: t },
    );

    if (overdueBookings.length === 0) {
      return { cancelled: 0, notified: 0 };
    }

    let cancelled = 0;
    let notified = 0;

    for (const booking of overdueBookings) {
      // The earliest overdue payment (already filtered by repo)
      const overduePaymentRecord = [...(booking.payments || [])].sort(
        (a, b) => new Date(a.due_date) - new Date(b.due_date),
      )[0];
      if (!overduePaymentRecord) continue;

      const dueDate = new Date(overduePaymentRecord.due_date);
      const now = new Date();
      const graceDays = Math.floor(
        (now.getTime() - dueDate.getTime()) / (24 * 60 * 60 * 1000),
      );

      // Mark the overdue payment as FAILED
      await paymentRepo.updatePaymentById(
        overduePaymentRecord.id,
        { payment_status: "FAILED" },
        { transaction: t },
      );

      // Cancel all remaining PENDING payments for this booking
      await paymentRepo.updatePaymentByBookingId(
        booking.id,
        { payment_status: "FAILED" },
        { transaction: t },
      );

      // Cancel the booking
      await bookingRepo.updateBookingById(
        booking.id,
        { status: "CANCELLED" },
        { transaction: t },
      );

      // Release the unit
      await storageUnitRepo.patchUnitStatus(
        booking.unit_id,
        { status: "AVAILABLE" },
        { transaction: t },
      );

      cancelled++;

      // Send notification email
      try {
        const emailContent = overduePaymentMailgenContent({
          customerName: booking.user?.full_name,
          bookingId: booking.id,
          unitLabel: booking.unit?.unit_number,
          overdueAmount: overduePaymentRecord.amount,
          dueDate,
          graceDays,
        });
        await sendEmail({
          email: booking.user?.email,
          subject: `Overdue Payment - Booking Cancelled - BoxWise`,
          mailgenContent: emailContent,
        });
        notified++;
      } catch (err) {
        console.error(
          `⚠️ Failed to send overdue-payment email for ${booking.id}:`,
          err.message,
        );
      }
    }

    return { cancelled, notified };
  });
}
