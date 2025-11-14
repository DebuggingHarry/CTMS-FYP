// Imports -------------------------------------------------
import express from "express";
import cors from "cors";
import database from "./database.js";

// Configure express app -----------------------------------
const app = express();

// Middleware ----------------------------------------------
app.use(express.json());

const ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:3000";

app.use(
  cors({
    origin: ORIGIN,
    credentials: true,
  })
);

app.options(/.*/, cors({ origin: ORIGIN, credentials: true }));

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", ORIGIN);
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,PATCH,DELETE,OPTIONS"
  );
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// Controllers ---------------------------------------------

const buildTrialsSelectSQL = (id, variant) => {
  let sql = "";

  let table = `
  clinicaltrials AS ct
  LEFT JOIN crctrials AS crc
    ON crc.trial_id = ct.trial_id
`;

  let fields = `
  ct.trial_id,
  ct.trial_name
`;

  switch (variant) {
    default:
      sql = `
    SELECT
      ${fields} FROM
      ${table}
    `;
      if (id) sql += `WHERE crc.user_id = ${id}`;
  }

  return sql;
};

const read = async (sql) => {
  try {
    const [result] = await database.query(sql);
    return result.length === 0
      ? { isSuccess: false, message: "No records found.", result: null }
      : { isSuccess: true, message: "Records retrieved successfully.", result };
  } catch (error) {
    return {
      isSuccess: false,
      message: `Failed to execute query: ${error.message}`,
      result: null,
    };
  }
};

const fromDbTrialRow = (r) => ({
  trialId: Number(r.trial_id),
  trialName: r.trial_name,
});

const fromDbTrials = (rows) => rows.map(fromDbTrialRow);

const getTrialsController = async (req, res, variant) => {
  const id = Number(req.params.crc_id);

  const sql = buildTrialsSelectSQL(id, variant);

  const { isSuccess, message, result } = await read(sql);
  if (!isSuccess) {
    return res.status(404).json({ message });
  }
  res.status(200).json(result);
};

// Endpoints -----------------------------------------------
app.get("/api/trials/crc/:crc_id", (req, res) =>
  getTrialsController(req, res, null)
);

// Start server --------------------------------------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
