import pool from "../db/pool.js";

const UNIT_TYPES = [
  { name: "Small", sqft: 30, price: 139.0 },
  { name: "Small", sqft: 40, price: 179.0 },
  { name: "Medium", sqft: 70, price: 279.0 },
  { name: "Medium", sqft: 80, price: 319.0 },
  { name: "Large", sqft: 100, price: 499.0 },
  { name: "Large", sqft: 120, price: 589.0 },
];

const STORAGE_UNITS = [
  { no: "S-01", size: "Small", sqft: 40, price: 100 },
  { no: "S-02", size: "Small", sqft: 40, price: 100 },
  { no: "S-03", size: "Small", sqft: 40, price: 100 },
  { no: "S-04", size: "Small", sqft: 40, price: 100 },
  { no: "S-05", size: "Small", sqft: 40, price: 100 },
  { no: "S-06", size: "Small", sqft: 40, price: 100 },
  { no: "S-07", size: "Small", sqft: 40, price: 100 },
  { no: "S-08", size: "Small", sqft: 40, price: 100 },
  { no: "M-01", size: "Medium", sqft: 80, price: 180 },
  { no: "M-02", size: "Medium", sqft: 80, price: 180 },
  { no: "M-03", size: "Medium", sqft: 80, price: 180 },
  { no: "M-04", size: "Medium", sqft: 80, price: 180 },
  { no: "M-05", size: "Medium", sqft: 80, price: 180 },
  { no: "M-06", size: "Medium", sqft: 80, price: 180 },
  { no: "L-01", size: "Large", sqft: 120, price: 250 },
  { no: "L-02", size: "Large", sqft: 120, price: 250 },
  { no: "L-03", size: "Large", sqft: 120, price: 250 },
  { no: "L-04", size: "Large", sqft: 120, price: 250 },
];

async function seedUnitTypes() {
  for (const type of UNIT_TYPES) {
    await pool.query(
      `
				INSERT INTO unit_types (type_name, sqft, base_price)
				VALUES (?, ?, ?)
				ON DUPLICATE KEY UPDATE
					sqft = VALUES(sqft),
					base_price = VALUES(base_price)
			`,
      [type.name, type.sqft, type.price]
    );
  }
  console.log("✅ Unit types seeded");
}

async function seedStorageUnits() {
  for (const unit of STORAGE_UNITS) {
    await pool.query(
      `
				INSERT INTO storage_units (room_number, size_type, square_feet, base_price, status)
				VALUES (?, ?, ?, ?, 'Available')
				ON DUPLICATE KEY UPDATE
					square_feet = VALUES(square_feet),
					base_price = VALUES(base_price),
					status = 'Available'
			`,
      [unit.no, unit.size, unit.sqft, unit.price]
    );
  }
  console.log("✅ Storage units seeded");
}

async function seedAll() {
  try {
    await pool.query("SELECT 1");
    await seedUnitTypes();
    await seedStorageUnits();
    console.log("🌱 All seeds completed");
    process.exit(0);
  } catch (err) {
    console.error("❌ Seeding error:", err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seedAll();
