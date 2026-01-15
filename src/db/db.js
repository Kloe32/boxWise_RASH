import { sequelize } from "./sequelize.js";
import initModels from "../models/init-models.js";

export const db = initModels(sequelize);
// db.Users, db.Bookings, db.StorageUnits, etc.
