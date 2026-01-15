import { db } from "../db/db.js";

export const storageUnitRepo = {
  getAllUnits() {
    return db.StorageUnits.findAll();
  },
};
