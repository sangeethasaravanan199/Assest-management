const { Pool } = require("pg");

function buildPoolConfig() {
  if (process.env.DATABASE_URL) {
    try {
      const url = new URL(process.env.DATABASE_URL);
      const password = decodeURIComponent(url.password || "");

      if (!password) {
        throw new Error(
          "DATABASE_URL is missing a password. Use format postgres://user:password@host:5432/database"
        );
      }

      return {
        host: url.hostname,
        port: Number(url.port || 5432),
        database: url.pathname.replace(/^\/+/, ""),
        user: decodeURIComponent(url.username || "postgres"),
        password,
      };
    } catch (error) {
      if (error.message.includes("missing a password")) {
        throw error;
      }
      throw new Error("DATABASE_URL is invalid. Please verify the URL format.");
    }
  }

  if (!process.env.DB_PASSWORD) {
    throw new Error(
      "DB_PASSWORD is missing. Set DATABASE_URL or DB_PASSWORD in backend/.env to connect to PostgreSQL."
    );
  }

  return {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME || "asset_management",
    user: process.env.DB_USER || "postgres",
    password: String(process.env.DB_PASSWORD),
  };
}

const pool = new Pool(buildPoolConfig());

pool.on("error", (err) => {
  console.error("Unexpected PostgreSQL error", err);
});

module.exports = pool;
