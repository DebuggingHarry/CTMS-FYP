// Imports -------------------------------------------------
import mysql from "mysql2/promise";

// Database connection -------------------------------------
const RAILWAY_URL =
  process.env.MYSQL_PUBLIC_URL ||
  process.env.MYSQL_URL ||
  "mysql://root:OijxHMSbTZBKPRWAxwcjnHvUnPqgSbcM@shortline.proxy.rlwy.net:24377/railway";

const url = new URL(RAILWAY_URL);

const dbConfig = {
  database: url.pathname.replace("/", ""),
  port: Number(url.port),
  host: url.hostname,
  user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
  namedPlaceholders: true,
  ssl: { rejectUnauthorized: false },
};

let database;

try {
  database = await mysql.createConnection(dbConfig);
} catch (error) {
  console.error("Database connection failed:", error);
  process.exit(1);
}

export default database;
