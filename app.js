// Imports -------------------------------------------------
import express from "express";
import cors from "cors";
import database from "./database.js";

// Configure express app -----------------------------------
const app = express();

// Middleware ----------------------------------------------
app.use(express.json({ type: "*/*" }));
const ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:3000";
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.options(/.*/, cors({ origin: true, credentials: true }));
app.use((req, res, next) => {
  // Reflect the request origin if present (keeps compatibility with credentials)
  res.header("Access-Control-Allow-Origin", req.headers.origin || ORIGIN);
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,PATCH,DELETE,OPTIONS"
  );
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});
app.use(express.json({ type: "*/*" }));
app.use(express.urlencoded({ extended: true }));

// Controllers ---------------------------------------------

const buildSetFields = (fields) =>
  fields.reduce(
    (setSQL, field, index) =>
      setSQL + `${field}=:${field}` + (index === fields.length - 1 ? "" : ", "),
    `SET `
  );
const buildTrialsInsertSQL = (record = {}) => {
  const table = `clinicaltrials`;
  let mutableFields = [
    "trial_name",
    "trial_status",
    "trial_description",
    "start_date",
    "end_date",
  ];
  const name = record.trial_name;

  return `INSERT INTO ${table} ` + buildSetFields(mutableFields);
};

const buildTrialStaffInsertSQL = () => {
  const table = `trial_staff`;
  const fields = ["trial_id", "user_id", "role_id", "start_date", "end_date"];
  return `INSERT INTO ${table} ` + buildSetFields(fields);
};

const buildTrialStaffRolesSelectSQL = () => {
  const table = `trial_staff_roles AS tsr`;
  const fields = `
  tsr.role_id,
  tsr.role_name
`;
  return `
    SELECT
      ${fields}
    FROM
      ${table}
    ORDER BY
      tsr.role_name ASC;
  `;
};

const buildStaffUsersSelectSQL = () => {
  const table = `users AS u`;
  const fields = `
  u.user_id,
  u.usertype_id,
  u.userFirstname AS userFirstname,
  u.userLastname AS userLastname,
  CONCAT(u.userFirstname, ' ', u.userLastname) AS fullName,
  u.participant_code,
  u.email
`;
  return `
    SELECT
      ${fields}
    FROM
      ${table}
    WHERE
      u.usertype_id IN (2, 3)
    ORDER BY
      u.participant_code ASC;
  `;
};

const buildTrialsSelectSQL = (id, variant) => {
  const table = `clinicaltrials AS ct`;
  const extendedTable = `
  clinicaltrials AS ct
  INNER JOIN trial_staff AS ts
    ON ts.trial_id = ct.trial_id
`;

  const fields = `
  ct.trial_id,
  ct.trial_name,
  ct.trial_status,
  ct.trial_description,
  ct.start_date,
  ct.end_date
`;
  const extendedFields = fields;

  let sql = "";

  switch (variant) {
    default:
      sql = `
    SELECT
      ${fields}
    FROM
      ${table}
    `;
      if (id) sql += `WHERE ct.trial_id = ${id}`;
      sql += `
    ORDER BY
      ct.trial_name ASC;
    `;
      break;

    case "clinical":
      sql = `
    SELECT
      ${extendedFields}
    FROM
      ${extendedTable}
    `;
      if (id) sql += `WHERE ts.user_id = ${id}`;
      sql += `
    ORDER BY
      ct.trial_name ASC;
    `;
  }

  return sql;
};

const createTrials = async (sql, record) => {
  try {
    const status = await database.query(sql, record);
    const trialId = status[0].insertId;

    const recoverRecord = buildTrialsSelectSQL(trialId, null);

    const { isSuccess, result, message } = await read(recoverRecord);

    return isSuccess
      ? { isSuccess: true, message: "Record retrieved successfully.", result }
      : {
          isSuccess: false,
          message: `Failed to recover the inserted record: ${message}`,
          result: null,
        };
  } catch (error) {
    return {
      isSuccess: false,
      message: `Failed to execute query: ${error.message}`,
      result: null,
    };
  }
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

const createTrialStaff = async (sql, record) => {
  try {
    const status = await database.query(sql, record);
    const staffId = status[0].insertId;

    return {
      isSuccess: true,
      message: "Trial staff record created successfully.",
      result: { trial_staff_id: staffId, ...record },
    };
  } catch (error) {
    return {
      isSuccess: false,
      message: `Failed to execute query: ${error.message}`,
      result: null,
    };
  }
};

const getTrialsController = async (res, id, variant) => {
  const sql = buildTrialsSelectSQL(id, variant);

  const { isSuccess, message, result } = await read(sql);
  if (!isSuccess) {
    return res.status(404).json({ message });
  }
  res.status(200).json(result);
};

const postTrialsController = async (req, res) => {
  const sql = buildTrialsInsertSQL(req.body);

  const { isSuccess, message, result } = await createTrials(sql, req.body);
  if (!isSuccess) {
    return res.status(500).json({ message });
  }
  res.status(201).json(result);
};

const getTrialStaffRolesController = async (req, res) => {
  const sql = buildTrialStaffRolesSelectSQL();

  const { isSuccess, message, result } = await read(sql);
  if (!isSuccess) {
    return res.status(404).json({ message });
  }
  res.status(200).json(result);
};

const getStaffUsersController = async (req, res) => {
  const sql = buildStaffUsersSelectSQL();

  const { isSuccess, message, result } = await read(sql);
  if (!isSuccess) {
    return res.status(404).json({ message });
  }
  res.status(200).json(result);
};

const postTrialStaffController = async (req, res) => {
  const sql = buildTrialStaffInsertSQL();

  const { isSuccess, message, result } = await createTrialStaff(sql, req.body);
  if (!isSuccess) {
    return res.status(500).json({ message });
  }
  res.status(201).json(result);
};

// Endpoints -----------------------------------------------
app.get("/api/trials/crc/:crc_id", (req, res) =>
  getTrialsController(res, req.params.crc_id, "clinical")
);
app.get("/api/trials", (req, res) => getTrialsController(res, null, null));

app.post("/api/trials", postTrialsController);

app.get("/api/trial-staff-roles", getTrialStaffRolesController);

app.get("/api/staff-users", getStaffUsersController);

app.post("/api/trial-staff", postTrialStaffController);

// Start server --------------------------------------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
