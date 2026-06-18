require("dotenv").config({ override: true });

const fs = require("fs");
const path = require("path");
const pool = require("../config/db");

async function initDb() {
  const sqlPath = path.join(__dirname, "../../sql/init.sql");
  const sql = fs.readFileSync(sqlPath, "utf8");

  try {
    await pool.query(sql);
    console.log("Database schema initialized successfully.");
  } catch (error) {
    console.error("Failed to initialize database schema", error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

initDb();
