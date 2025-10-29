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

const fromDbTrialRow = (r) => ({
  trialId: Number(r.trial_id),
  trialName: r.trial_name,
});
const fromDbTrials = (rows) => rows.map(fromDbTrialRow);

const getCrcTrialsController = async (req, res) => {
  const crcId = Number(req.params.crc_id);

  if (!Number.isFinite(crcId) || crcId <= 0) {
    return res.status(400).json({ success: false, message: "Invalid CRC id." });
  }

  const sql = `
    SELECT 
      ct.trial_id, 
      ct.trial_name
    FROM 
      clinicaltrials AS ct
    INNER JOIN 
      crctrials AS crc 
      ON crc.trial_id = ct.trial_id
    WHERE 
      crc.user_id = ?
    ORDER BY 
      ct.trial_name ASC;
  `;

  try {
    const [result] = await database.query(sql, [crcId]);
    const data = fromDbTrials(result);

    if (data.length === 0) {
      return res
        .status(200)
        .json({ success: false, message: "No records found.", data: [] });
    }

    return res.status(200).json({
      success: true,
      message: "Records retrieved successfully.",
      data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: `Failed to execute query: ${error.message}`,
    });
  }
};

// Endpoints -----------------------------------------------
app.get("/api/trials/users/:crc_id", getCrcTrialsController);

// Start server --------------------------------------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
