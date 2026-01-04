import pool from "../db/pool.js";

export async function getAllStorageUnits({ size_type, status }) {
  const where = [];
  const params = [];
  if (size_type) {
    where.push("size_type = ?");
    params.push(size_type);
  }

  if (status) {
    where.push("status = ?");
    params.push(status);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const [rows] = await pool.query(
    `
        SELECT id, room_number, size_type, square_feet, base_price, status 
        FROM storage_units
        ${whereSql}
    `,
    params
  );

  return rows;
}

export async function getStorageUnitById(room_id) {
  const [rows] = await pool.query(
    `
            SELECT id, room_number, size_type, square_feet, base_price, status
            FROM storage_units
            WHERE id = ?
            LIMIT 1
        `,
    [room_id]
  );
  return rows[0] ?? null;
}
