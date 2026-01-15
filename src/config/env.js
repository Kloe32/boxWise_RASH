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
};
