import pool from "../db/pool.js";

const rooms = [
  // Small
  { no: "S-01", size: "Small", sqft: 40, price: 100 },
  { no: "S-02", size: "Small", sqft: 40, price: 100 },
  { no: "S-03", size: "Small", sqft: 40, price: 100 },
  { no: "S-04", size: "Small", sqft: 40, price: 100 },
  { no: "S-05", size: "Small", sqft: 40, price: 100 },
  { no: "S-06", size: "Small", sqft: 40, price: 100 },
  { no: "S-07", size: "Small", sqft: 40, price: 100 },
  { no: "S-08", size: "Small", sqft: 40, price: 100 },

  // Medium
  { no: "M-01", size: "Medium", sqft: 80, price: 180 },
  { no: "M-02", size: "Medium", sqft: 80, price: 180 },
  { no: "M-03", size: "Medium", sqft: 80, price: 180 },
  { no: "M-04", size: "Medium", sqft: 80, price: 180 },
  { no: "M-05", size: "Medium", sqft: 80, price: 180 },
  { no: "M-06", size: "Medium", sqft: 80, price: 180 },

  // Large
  { no: "L-01", size: "Large", sqft: 120, price: 250 },
  { no: "L-02", size: "Large", sqft: 120, price: 250 },
  { no: "L-03", size: "Large", sqft: 120, price: 250 },
  { no: "L-04", size: "Large", sqft: 120, price: 250 },
];

export async function seedRooms() {
  for (const r of rooms) {
    await pool.query(
      `
      INSERT INTO storage_units
        (room_number, size_type, square_feet, base_price, status)
      VALUES (?, ?, ?, ?, 'Available')
      ON DUPLICATE KEY UPDATE
        square_feet = VALUES(square_feet),
        base_price = VALUES(base_price),
        status = 'Available'
      `,
      [r.no, r.size, r.sqft, r.price]
    );
  }
  console.log("✅ Storage units seeded");
  process.exit(0);
}

seedRooms().catch((err) => {
  console.log("❌Error Seeding Units: ", err.message);
  process.exit(1);
});
