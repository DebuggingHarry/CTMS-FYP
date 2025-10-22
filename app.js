// Imports -------------------------------------------------
import express from "express";
import database from "./database.js";

// Configue express app ------------------------------------
const app = new express();

// Configure middleware ------------------------------------

// Controllers ---------------------------------------------

// --- Conformance: DB row to JS object --------------------
const fromDbTrialRow = (r) => ({
  trialId: Number(r.trial_id),
  trialName: r.trial_name,
});
const fromDbTrials = (rows) => rows.map(fromDbTrialRow);

const getCrcTrialsController = async (req, res) => {
  const crcId = Number(req.params.crcId);
  const trialId =
    req.params.trialId !== undefined ? Number(req.params.trialId) : null;

  if (!Number.isFinite(crcId) || crcId <= 0) {
    return res.status(400).json({ success: false, message: "Invalid CRC id." });
  }
  if (trialId !== null && (!Number.isFinite(trialId) || trialId <= 0)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid trialId." });
  }

  // Build SQL ----------------------------------------------
  const table = "clinicaltrials";
  const trialIdField = "clinicaltrials.trial_id";

  const extendedTable = `${table}
    LEFT JOIN crctrials 
      ON crctrials.trial_id = clinicaltrials.trial_id
     AND crctrials.user_id = ?`;

  const fields = ["clinicaltrials.trial_id", "clinicaltrials.trial_name"];
  const extendedFields = fields.join(", ");

  let sql = `
    SELECT ${extendedFields}
    FROM ${extendedTable}
    WHERE crctrials.user_id IS NOT NULL
  `;

  const params = [crcId];
  if (trialId !== null) {
    sql += ` AND ${trialIdField} = ?`;
    params.push(trialId);
  }

  sql += ` ORDER BY clinicaltrials.trial_name ASC`;

  // Execute query --------------------------------------------
  let message = "";
  try {
    const [result] = await database.query(sql, params);

    const data = fromDbTrials(result);

    if (data.length === 0) {
      message = "No records found.";
      return res.status(200).json({ success: false, message, data: [] });
    }

    message = "Records retrieved successfully.";
    return res.status(200).json({ success: true, message, data });
  } catch (error) {
    message = `Failed to execute query: ${error.message}`;
    return res.status(500).json({ success: false, message });
  }
};

// Endpoints ---------------------------------------------

app.get("/api/user/:crcId/trials", getCrcTrialsController);
app.get("/api/user/:crcId/trials/:trialId", getCrcTrialsController);

// Start server --------------------------------------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
