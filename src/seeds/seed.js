import { db } from "../db/db.js";

const types = [
  { name: "Small", sqft: 30, price: 139.0 },
  { name: "Small", sqft: 40, price: 179.0 },
  { name: "Medium", sqft: 70, price: 279.0 },
  { name: "Medium", sqft: 80, price: 319.0 },
  { name: "Large", sqft: 100, price: 499.0 },
  { name: "Large", sqft: 120, price: 589.0 },
];
const storageUnits = [
  // Small units (8)
  { room_number: "S-1", status: "AVAILABLE", type_id: 1 },
  { room_number: "S-2", status: "AVAILABLE", type_id: 1 },
  { room_number: "S-3", status: "AVAILABLE", type_id: 1 },
  { room_number: "S-4", status: "AVAILABLE", type_id: 1 },
  { room_number: "S-5", status: "AVAILABLE", type_id: 2 },
  { room_number: "S-6", status: "AVAILABLE", type_id: 2 },
  { room_number: "S-7", status: "AVAILABLE", type_id: 2 },
  { room_number: "S-8", status: "AVAILABLE", type_id: 2 },

  // Medium units (6)
  { room_number: "M-1", status: "AVAILABLE", type_id: 3 },
  { room_number: "M-2", status: "AVAILABLE", type_id: 3 },
  { room_number: "M-3", status: "AVAILABLE", type_id: 3 },
  { room_number: "M-4", status: "AVAILABLE", type_id: 4 },
  { room_number: "M-5", status: "AVAILABLE", type_id: 4 },
  { room_number: "M-6", status: "AVAILABLE", type_id: 4 },

  // Large units (4)
  { room_number: "L-1", status: "AVAILABLE", type_id: 5 },
  { room_number: "L-2", status: "AVAILABLE", type_id: 5 },
  { room_number: "L-3", status: "AVAILABLE", type_id: 5 },
  { room_number: "L-4", status: "AVAILABLE", type_id: 6 },
];

export async function seedUnitTypes() {
  for (const data of types) {
    await db.UnitTypes.create({
      type_name: data.name,
      sqft: data.sqft,
      base_price: data.price,
    });
  }
  console.log("✅ Unit Types seeded");
}

export async function seedUnits() {
  for (const u of storageUnits) {
    await db.StorageUnits.create({
      room_number: u.room_number,
      status: u.status,
      type_id: u.type_id,
    });
  }
  console.log("✅ Storage units seeded");
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

runSeeds();

