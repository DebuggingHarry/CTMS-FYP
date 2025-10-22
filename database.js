// Imports -------------------------------------------------
import mysql from "mysql2/promise";
import { data } from "react-router-dom";

// Database connection -------------------------------------
const dbConfig = {
  database: process.env.DB_NAME || "ctms",
  port: process.env.DB_PORT || 3306,
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PSWD || "",
  namedPlaceholders: true,
};

let database;

try {
  database = await mysql.createConnection(dbConfig);
} catch (error) {
  console.error("Database connection failed:", error);
  process.exit(1);
}

export default database;
