import express from "express";
import { env } from "./src/config/env.js";
import cors from "cors";
import { sequelize } from "./src/db/sequelize.js";

const app = express();
const PORT = env.PORT || 8080;
app.use(express.json());

async function start() {
  await sequelize.authenticate();
  console.log("Database Connected!🟢");

  app.listen(PORT, () => {
    console.log(`🚀 Server is Listening on http://localhost:${PORT}`);
  });
}

app.get("/", (req, res) => {
  res.send("Hello from BoxWise");
});

start().catch((err) => {
  console.error("❌Startup Error:", err.message);
  process.exit(1);
});

app.use(cors());

//Routes
import authRouter from "./src/routes/auth.route.js";
app.use("/api/v1/user", authRouter);

import unitRouter from "./src/routes/storage_unit.route.js";
app.use("/api/v1/storage-unit", unitRouter);
