import { db } from "../db/db.js";
import { storageUnits, types, bookingHistory } from "./seedData.js";

async function seedUnitTypes() {
  for (const data of types) {
    await db.UnitTypes.create({
      type_name: data.name,
      sqft: data.sqft,
      base_price: data.price,
    });
  }
  console.log("✅ Unit Types seeded");
}

async function seedUnits() {
  for (const u of storageUnits) {
    await db.StorageUnits.create({
      room_number: u.room_number,
      status: u.status,
      type_id: u.type_id,
    });
  }
  console.log("✅ Storage units seeded");
}

async function seedBookings() {
  for (const b of bookingHistory) {
    await db.Bookings.create({
      id: b.id,
      user_id: b.user_id,
      unit_id: b.unit_id,
      start_date: b.start_date,
      end_date: b.end_date,
      return_date: b.return_date,
      final_price: b.final_price,
      status: b.status,
    });
  }
  console.log("✅ Historcal Booking Data Seeded!");
}

async function runSeeds() {
  try {
    await seedUnitTypes();
    await seedUnits();
    process.exit(0);
  } catch (e) {
    console.error("🟥 Error seeding:", e);
    process.exit(1);
  }
}

seedBookings().catch((err) => console.log("SEQUELIZE ERROR:", err));
// runSeeds();
