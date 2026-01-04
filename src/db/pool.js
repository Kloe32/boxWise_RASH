import mysql from "mysql2";
import { config } from "../config/config.js";

const pool = mysql.createPool({
  host: config.DB_HOST,
  port: Number(config.DB_PORT),
  user: config.DB_USER,
  password: config.DB_PASSWORD,
  database: config.DB_NAME,
  waitForConnections: true,
  connectionLimit: config.DB_CONNECTION_LIMIT,
  queueLimit: 0,
});

export default pool.promise();
