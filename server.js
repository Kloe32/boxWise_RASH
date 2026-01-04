import express from "express";
import { config } from "./src/config/config.js";
import redis from "redis";
import cors from "cors";
import pool from "./src/db/pool.js";

const app = express();
const PORT = config.PORT || 8080;
app.use(express.json());

async function start() {
  await pool.query("SELECT 1");
  console.log("MYSQL Connected ✅");
  app.listen(PORT, () => {
    console.log(`🚀 Server is Listening on http://localhost:${PORT}`);
  });
}

app.get("/", (req, res) => {
  res.send("Hello from BoxWise");
});

app.get("/db-test", async (req, res) => {
  const [rows] = await pool.query("SELECT NOW() AS now");
  res.json(rows[0]);
});

start().catch((err) => {
  console.error("❌Startup Error:", err.message);
  process.exit(1);
});

app.use(cors());

//Routes
import userRouter from "./src/routes/user.route.js";
app.use("/api/v1/user", userRouter);
import storageRouter from "./src/routes/storage_unit.route.js";
app.use("/api/v1/storage-unit", storageRouter);
