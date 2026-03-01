import { bookingRepo } from "../../repositories/booking.repo.js";
import {
  paymentDueSoonReminderMailgenContent,
  sendEmail,
} from "../../utils/mail.js";

export async function paymentDue() {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const bookings = await bookingRepo.findBookingsWithPaymentDue();
  let remindersSent = 0;

  for (const booking of bookings) {
    const pendingPayment = [...(booking.payments || [])].sort(
      (a, b) => new Date(a.due_date) - new Date(b.due_date),
    )[0];
    if (!pendingPayment) continue;
    const dueDate = new Date(pendingPayment.due_date);
    const dueDateStart = new Date(dueDate);
    dueDateStart.setHours(0, 0, 0, 0);
    const daysUntilDue = Math.max(
      0,
      Math.ceil((dueDateStart - todayStart) / (24 * 60 * 60 * 1000)),
    );
    if (daysUntilDue > 3) continue; // Only send reminders for payments due within the next 3 days
    const emailContent = paymentDueSoonReminderMailgenContent({
      customerName: booking.user.full_name,
      unitLabel: booking.unit.unit_number,
      dueDate,
      paymentType: pendingPayment.description,
      amount: pendingPayment.amount,
      daysUntilDue,
    });

    try {
      await sendEmail({
        email: booking.user.email,
        subject: `Payment Reminder: Due in ${daysUntilDue} ${
          daysUntilDue === 1 ? "day" : "days"
        } - BoxWise`,
        mailgenContent: emailContent,
      });
      remindersSent += 1;
    } catch (err) {
      console.error(
        `⚠️ Failed to send payment-due email for booking ${booking.id}:`,
        err.message,
      );
    }
  }

  return {
    bookingsScanned: bookings.length,
    remindersSent,
  };
}
