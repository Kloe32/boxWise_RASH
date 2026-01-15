import pool from "../db/pool.js";

const types = [
  { name: "Small", sqft: 30, price: 139.0 },
  { name: "Small", sqft: 40, price: 179.0 },
  { name: "Medium", sqft: 70, price: 279.0 },
  { name: "Medium", sqft: 80, price: 319.0 },
  { name: "Large", sqft: 100, price: 499.0 },
  { name: "Large", sqft: 120, price: 589.0 },
];

export async function seedRooms() {
  for (const data of types) {
    await pool.query(
      `
      INSERT INTO unit_types
        (type_name,sqft, base_price)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE
        sqft = VALUES(sqft),
        base_price = VALUES(base_price),
      `,
      [data.name, data.sqft, data.price]
    );
  }
  console.log("✅ Unit Types seeded");
  process.exit(0);
}

seedRooms().catch((err) => {
  console.log("❌Error Seeding Unit Types: ", err.message);
  process.exit(1);
});
