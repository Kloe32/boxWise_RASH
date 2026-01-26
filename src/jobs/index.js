import cron from "node-cron";
import { releaseExpiredBookings } from "../jobs/definitions/releaseExpiredBookings.job.js";

export function startJobs() {
  // Runs every 10 minutes
  console.log("Cron jobs Starting...");

  cron.schedule("*/1 * * * *", async () => {
    try {
      const result = await releaseExpiredBookings();
      if (result.cancelled > 0) {
        console.log(`🕒 Released expired bookings: ${result.cancelled}`);
      }
    } catch (e) {
      console.error("❌ releaseExpiredBookings failed:", e);
    }
  });
}
