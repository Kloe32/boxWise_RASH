import cron from "node-cron";
import { releaseExpiredBookings } from "../jobs/definitions/releaseExpiredBookings.job.js";
import { adjustStorageUnitPrice } from "./definitions/adjustStorageUnitPrice.job.js";
import { paymentDue } from "./definitions/paymentDue.job.js";
import { bookingEnding } from "./definitions/bookingEnding.job.js";
import { overduePayment } from "./definitions/overduePayment.job.js";

export function startJobs() {
  // Runs every 10 minutes
  console.log("🕒 Cron jobs Starting...");

  cron.schedule("0 9 * * *", async () => {
    try {
      const result = await releaseExpiredBookings();
      if (result.cancelled > 0) {
        console.log(`🕒 Released expired bookings: ${result.cancelled}`);
      } else {
        console.log(`🕒 No expired bookings to release`);
      }
    } catch (e) {
      console.error("❌ releaseExpiredBookings failed:", e);
    }
  });

  cron.schedule("*/5 * * * *", async () => {
    try {
      const result = await adjustStorageUnitPrice();
      if (result) console.log("🕒 Dynamic Pricing Updated!", result);
    } catch (e) {
      console.error("❌ Pricing Adjustment failed:", e);
    }
  });

  // Runs every day at 09:00 server time
  cron.schedule("0 9 * * *", async () => {
    try {
      const result = await paymentDue();
      if (result?.remindersSent > 0) {
        console.log(
          `🕒 Payment reminders sent: ${result.remindersSent}/${result.bookingsScanned}`,
        );
      }
    } catch (e) {
      console.error("❌ paymentDue failed:", e);
    }
  });

  cron.schedule("0 9 * * *", async () => {
    try {
      const result = await bookingEnding();
      if (result?.flagged > 0) {
        console.log(
          `🕒 Bookings flagged as VACATING: ${result.flagged}, emails sent: ${result.notified}`,
        );
      } else {
        console.log(`🕒 No bookings approaching end date to flag`);
      }
    } catch (e) {
      console.error("❌ bookingEnding failed:", e);
    }
  });

  // Runs every day at 10:00 — cancel bookings with payments overdue > 7 days
  cron.schedule("0 10 * * *", async () => {
    try {
      const result = await overduePayment();
      if (result?.cancelled > 0) {
        console.log(
          `🕒 Overdue bookings cancelled: ${result.cancelled}, notified: ${result.notified}`,
        );
      } else {
        console.log(`🕒 No overdue bookings to cancel`);
      }
    } catch (e) {
      console.error("❌ overduePayment failed:", e);
    }
  });
}
