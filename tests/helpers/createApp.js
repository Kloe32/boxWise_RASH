/**
 * Minimal Express app factory for integration tests.
 * Mirrors the real server.js route wiring but does NOT:
 *  • connect to a database
 *  • start an HTTP server
 *  • start cron jobs
 */
import express from "express";
import { errorHandler } from "../../src/middlewares/error.middleware.js";

export function createApp({
  authRouter,
  unitRouter,
  bookingRouter,
  typeRouter,
}) {
  const app = express();
  app.use(express.json());

  if (authRouter) app.use("/api/v1/user", authRouter);
  if (unitRouter) app.use("/api/v1/storage-unit", unitRouter);
  if (bookingRouter) app.use("/api/v1/bookings", bookingRouter);
  if (typeRouter) app.use("/api/v1/unit-type", typeRouter);

  app.use(errorHandler);
  return app;
}
