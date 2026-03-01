import "dotenv/config";

export const env = {
  PORT: process.env.PORT,
  SECRET_KEY: process.env.SECRET_KEY,
  DB_PORT: process.env.DB_PORT,
  DB_HOST: process.env.DB_HOST,
  DB_USER: process.env.DB_USER,
  DB_PASSWORD: process.env.DB_PASSWORD,
  DB_NAME: process.env.DB_NAME,
  DB_CONNECTION_LIMIT: process.env.DB_CONNECTION_LIMIT,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRY: process.env.JWT_EXPIRY,
  GST_RATE: process.env.GST_RATE,
  ADMIN_FEE: process.env.ADMIN_FEE,
  MAILTRAP_SMTP_HOST: process.env.MAILTRAP_SMTP_HOST,
  MAILTRAP_SMTP_PORT: process.env.MAILTRAP_SMTP_PORT,
  MAILTRAP_SMTP_USER: process.env.MAILTRAP_SMTP_USER,
  MAILTRAP_SMTP_PASS: process.env.MAILTRAP_SMTP_PASS,
};
