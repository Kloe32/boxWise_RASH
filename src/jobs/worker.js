import { sequelize } from "../db/sequelize.js";
import { startJobs } from "./index.js";

async function startWorker() {
  await sequelize.authenticate();
  console.log("🟢 Job Worker: Database Connected");
  startJobs();
}

startWorker().catch((err) => {
  console.error("❌ Job Worker Startup Error:", err.message);
  process.exit(1);
});
