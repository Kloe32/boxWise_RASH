import db from "../db/pool.js";

export default class User {
  // 1. Setup Table
  static async initTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    try {
      await db.query(query);
      console.log("⭐⭐ Users table is ready in the cloud!");
    } catch (err) {
      console.error("❌ Error creating table:", err.message);
    }
  }

  // 2. Create User (INSERT)
  static async create(username, email) {
    const query = "INSERT INTO users (username, email) VALUES (?, ?)";
    const [result] = await db.query(query, [username, email]);
    return result;
  }

  // 3. Get All Users (SELECT)
  static async getAll() {
    const [rows] = await db.query(
      "SELECT * FROM users ORDER BY created_at DESC"
    );
    return rows;
  }

  //4.Get User by email (SELECT)
  static async getUserByEmail(email) {
    const query = "SELECT * FROM users WHERE email = ?";
    const [rows] = await db.query(query, [email]);
    return rows[0] || null;
  }
}
