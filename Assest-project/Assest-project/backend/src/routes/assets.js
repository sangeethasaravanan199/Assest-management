const express = require("express");
const { z } = require("zod");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const pool = require("../config/db");
const { authenticate, authorize } = require("../middleware/auth");
const {
  processBulkAssetUpload,
  buildTemplateCsv,
  buildTemplateXlsxBuffer,
} = require("../services/assetBulkUploadService");

const router = express.Router();

const maxUploadBytes = 5 * 1024 * 1024;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxUploadBytes },
  fileFilter: (_req, file, cb) => {
    const extension = path.extname(file.originalname || "").toLowerCase();
    if (![".csv", ".xlsx"].includes(extension)) {
      return cb(new Error("Only .csv and .xlsx files are allowed"));
    }
    return cb(null, true);
  },
});

const auditUploadRoot = path.join(__dirname, "../../uploads/audit-evidence");
fs.mkdirSync(auditUploadRoot, { recursive: true });

const auditAllowedExtensions = new Set([".jpg", ".jpeg", ".png", ".mp4", ".webm"]);
const auditAllowedMimeTypes = new Set(["image/jpeg", "image/png", "video/mp4", "video/webm"]);
const maxAuditEvidenceBytes = 50 * 1024 * 1024;

const auditEvidenceUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, auditUploadRoot),
    filename: (_req, file, cb) => {
      const extension = path.extname(file.originalname || "").toLowerCase();
      const safeExtension = auditAllowedExtensions.has(extension) ? extension : "";
      cb(null, `${Date.now()}-${crypto.randomUUID()}${safeExtension}`);
    },
  }),
  limits: { fileSize: maxAuditEvidenceBytes, files: 12 },
  fileFilter: (_req, file, cb) => {
    const extension = path.extname(file.originalname || "").toLowerCase();
    const mime = String(file.mimetype || "").toLowerCase();
    const allowedMime = auditAllowedMimeTypes.has(mime);
    if (!allowedMime || !auditAllowedExtensions.has(extension)) {
      return cb(new Error("Only .jpg, .jpeg, .png, .mp4, and .webm files are allowed"));
    }
    return cb(null, true);
  },
});

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().trim().optional().default(""),
  status: z.string().trim().optional().default(""),
  type: z.string().trim().optional().default(""),
  sortField: z.enum(["id", "assetTag", "name", "type", "status", "location", "purchaseDate", "warrantyExpiry"]).optional().default("id"),
  sortDirection: z.enum(["asc", "desc"]).optional().default("desc"),
});

const assetSchema = z.object({
  assetTag: z.string().min(3),
  name: z.string().min(2),
  type: z.enum(["laptop", "desktop", "monitor", "printer", "network_device"]),
  location: z.string().min(2),
  purchaseDate: z.string().min(10),
  warrantyExpiry: z.string().min(10),
  specs: z.string().optional(),
});

const assetUpdateSchema = assetSchema
  .partial()
  .extend({
    status: z.enum(["available", "reserved", "assigned", "maintenance", "retired"]).optional(),
  });

const assignSchema = z.object({
  employeeId: z.number().int().positive(),
  expectedReturnDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected return date must be in YYYY-MM-DD format")
    .refine((value) => value >= new Date().toISOString().slice(0, 10), {
      message: "Expected return date cannot be in the past",
    }),
  notes: z.string().max(500).optional(),
});

const stockSourceOptions = ["purchase", "return", "adjustment"];
const stockTypeOptions = ["laptop", "desktop", "monitor", "printer", "network_device"];

const addStockSchema = z.object({
  name: z.string().trim().min(2, "Asset name is required"),
  type: z.enum(stockTypeOptions, { message: "Invalid category" }),
  quantity: z.coerce.number().int().positive("Quantity must be a positive integer"),
  location: z.string().trim().min(2, "Location is required"),
  vendor: z.string().trim().max(180).optional().default(""),
  purchaseDate: z.string().trim().optional().default(""),
  warrantyExpiry: z.string().trim().optional().default(""),
  unitCost: z
    .union([z.number(), z.string()])
    .optional()
    .transform((value) => {
      if (value === undefined || value === null || String(value).trim() === "") return null;
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : NaN;
    })
    .refine((value) => value === null || value >= 0, { message: "Cost must be non-negative" }),
  remarks: z.string().trim().max(500).optional().default(""),
  source: z.enum(stockSourceOptions).optional().default("purchase"),
  serialNumbers: z.array(z.string().trim().min(1)).max(500).optional().default([]),
});

const auditStatusOptions = ["verified", "missing", "damaged"];
const auditPhysicalStatusOptions = ["assigned", "available", "repair", "retired"];
const auditPhysicalConditionOptions = ["good", "damaged", "not_working", "not_found"];
const auditResolutionOptions = ["open", "in_progress", "closed"];

const auditEntrySchema = z.object({
  auditStatus: z.enum(auditStatusOptions),
  physicalStatus: z.enum(auditPhysicalStatusOptions),
  physicalCondition: z.enum(auditPhysicalConditionOptions),
  remarks: z.string().trim().max(2000).optional().default(""),
  reason: z.string().trim().max(1000).optional().default(""),
  responsiblePerson: z.string().trim().max(180).optional().default(""),
  targetDate: z.string().trim().optional().default(""),
  resolutionStatus: z.enum(auditResolutionOptions).optional().default("open"),
  auditDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
  compliant: z.boolean().optional().default(false),
});

const auditListSchema = z.object({
  search: z.string().trim().optional().default(""),
  type: z.string().trim().optional().default(""),
  auditStatus: z.string().trim().optional().default(""),
  employee: z.string().trim().optional().default(""),
  location: z.string().trim().optional().default(""),
});

function fileKindFromMime(mimeType) {
  return String(mimeType || "").toLowerCase().startsWith("video/") ? "video" : "photo";
}

function isValidDateString(value) {
  if (!value) return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

async function ensureStockLogTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS asset_stock_logs (
      id SERIAL PRIMARY KEY,
      name VARCHAR(180) NOT NULL,
      type VARCHAR(30) NOT NULL,
      quantity INTEGER NOT NULL CHECK (quantity > 0),
      location VARCHAR(120) NOT NULL,
      vendor VARCHAR(180),
      purchase_date DATE,
      warranty_expiry DATE,
      unit_cost NUMERIC(12, 2),
      default_status VARCHAR(20) NOT NULL,
      remarks TEXT,
      source VARCHAR(20) NOT NULL CHECK (source IN ('purchase', 'return', 'adjustment')),
      added_by INTEGER NOT NULL REFERENCES users(id),
      added_at TIMESTAMP NOT NULL DEFAULT NOW(),
      created_asset_ids INTEGER[] NOT NULL DEFAULT '{}'
    )
  `);
}

async function ensureAuditTables(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS asset_audits (
      id SERIAL PRIMARY KEY,
      asset_id INTEGER NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
      auditor_id INTEGER NOT NULL REFERENCES users(id),
      audit_status VARCHAR(20) NOT NULL CHECK (audit_status IN ('verified', 'missing', 'damaged')),
      physical_status VARCHAR(20) NOT NULL CHECK (physical_status IN ('assigned', 'available', 'repair', 'retired')),
      physical_condition VARCHAR(20) NOT NULL CHECK (physical_condition IN ('good', 'damaged', 'not_working', 'not_found')),
      remarks TEXT,
      reason TEXT,
      responsible_person VARCHAR(180),
      target_date DATE,
      resolution_status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (resolution_status IN ('open', 'in_progress', 'closed')),
      audit_date DATE NOT NULL,
      compliant BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE (asset_id)
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS asset_audit_files (
      id SERIAL PRIMARY KEY,
      audit_id INTEGER NOT NULL REFERENCES asset_audits(id) ON DELETE CASCADE,
      asset_id INTEGER NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
      uploaded_by INTEGER NOT NULL REFERENCES users(id),
      file_kind VARCHAR(10) NOT NULL CHECK (file_kind IN ('photo', 'video')),
      original_name VARCHAR(260) NOT NULL,
      stored_name VARCHAR(260) NOT NULL UNIQUE,
      mime_type VARCHAR(150) NOT NULL,
      size_bytes BIGINT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
}

const assetPrefixByType = {
  laptop: "LAP",
  desktop: "DESK",
  monitor: "MON",
  printer: "PRN",
  network_device: "NET",
};

async function getNextAssetSequence(client, prefix) {
  const result = await client.query(
    `
    SELECT COALESCE(MAX((substring(asset_tag from $1))::int), 0) AS max_sequence
    FROM assets
    WHERE asset_tag ~ $2
    `,
    [`^${prefix}-([0-9]+)$`, `^${prefix}-[0-9]+$`]
  );

  return Number(result.rows[0]?.max_sequence || 0);
}

function buildAssetTag(prefix, sequence) {
  return `${prefix}-${String(sequence).padStart(4, "0")}`;
}

router.get("/summary", authenticate, async (req, res, next) => {
  try {
    const summaryResult = await pool.query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'available')::int AS available,
        COUNT(*) FILTER (WHERE status = 'reserved')::int AS reserved,
        COUNT(*) FILTER (WHERE status = 'assigned')::int AS assigned,
        COUNT(*) FILTER (WHERE status = 'assigned')::int AS in_use,
        COUNT(*) FILTER (WHERE status = 'maintenance')::int AS under_maintenance,
        COUNT(*) FILTER (WHERE status = 'retired')::int AS retired,
        COUNT(*) FILTER (WHERE status = 'lost')::int AS lost
      FROM assets
    `);

    return res.json(summaryResult.rows[0]);
  } catch (error) {
    return next(error);
  }
});

router.get("/stock-logs", authenticate, async (req, res, next) => {
  const client = await pool.connect();
  try {
    await ensureStockLogTable(client);

    const result = await client.query(
      `
      SELECT
        COALESCE(NULLIF(TRIM(vendor), ''), 'Unknown Supplier') AS supplier,
        COUNT(*)::int AS entries,
        COALESCE(SUM(quantity), 0)::int AS "totalQuantity",
        MAX(added_at) AS "lastAddedAt",
        COALESCE(SUM(COALESCE(unit_cost, 0) * quantity), 0)::numeric(14,2) AS "totalValue"
      FROM asset_stock_logs
      GROUP BY COALESCE(NULLIF(TRIM(vendor), ''), 'Unknown Supplier')
      ORDER BY MAX(added_at) DESC
      `
    );

    return res.json(result.rows);
  } catch (error) {
    return next(error);
  } finally {
    client.release();
  }
});

router.get("/assignments", authenticate, authorize("admin", "it"), async (req, res, next) => {
  try {
    const employeeId = req.query.employeeId ? parseInt(req.query.employeeId, 10) : null;
    const values = [];
    const whereClauses = [];

    if (employeeId) {
      values.push(employeeId);
      whereClauses.push(`aa.employee_id = $${values.length}`);
    }

    const where = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";

    const result = await pool.query(`
      SELECT
        aa.id,
        a.id                    AS "assetId",
        a.asset_tag             AS "assetTag",
        a.name                  AS "assetName",
        a.type                  AS "assetType",
        a.location              AS "location",
        emp.id                  AS "employeeId",
        emp.name                AS "employeeName",
        emp.email               AS "employeeEmail",
        emp.department          AS "department",
        adm.name                AS "assignedByName",
        aa.assigned_at          AS "assignedAt",
        aa.expected_return_date AS "expectedReturnDate",
        aa.returned_at          AS "returnedAt",
        aa.notes
      FROM asset_assignments aa
      INNER JOIN assets a   ON a.id   = aa.asset_id
      INNER JOIN users  emp ON emp.id = aa.employee_id
      INNER JOIN users  adm ON adm.id = aa.assigned_by
      ${where}
      ORDER BY aa.assigned_at DESC
    `, values);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

router.get("/", authenticate, async (req, res, next) => {
  try {
    const query = listQuerySchema.parse(req.query);
    const offset = (query.page - 1) * query.pageSize;
    const values = [];
    const whereClauses = [];
    const sortMap = {
      id: 'a.id',
      assetTag: 'a.asset_tag',
      name: 'a.name',
      type: 'a.type',
      status: 'a.status',
      location: 'a.location',
      purchaseDate: 'a.purchase_date',
      warrantyExpiry: 'a.warranty_expiry',
    };

    if (query.search) {
      values.push(`%${query.search}%`);
      whereClauses.push(`(
        a.asset_tag ILIKE $${values.length}
        OR a.name ILIKE $${values.length}
        OR a.location ILIKE $${values.length}
        OR COALESCE(a.specs, '') ILIKE $${values.length}
      )`);
    }

    if (query.status) {
      values.push(query.status);
      whereClauses.push(`a.status = $${values.length}`);
    }

    if (query.type) {
      values.push(query.type);
      whereClauses.push(`a.type = $${values.length}`);
    }

    // Employees can only view assets currently assigned to themselves.
    if (req.user.role === "employee") {
      values.push(req.user.id);
      whereClauses.push(`a.status = 'assigned'`);
      whereClauses.push(`latest.employee_id = $${values.length}`);
    }

    const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";

    const baseFrom = `
      FROM assets a
      LEFT JOIN (
        SELECT DISTINCT ON (asset_id)
          aa.asset_id,
          aa.employee_id,
          u.name AS employee_name,
          u.department AS employee_department,
          aa.assigned_at
        FROM asset_assignments aa
        INNER JOIN users u ON u.id = aa.employee_id
        WHERE aa.returned_at IS NULL
        ORDER BY aa.asset_id, aa.assigned_at DESC
      ) latest ON latest.asset_id = a.id
      ${whereSql}
    `;

    const countResult = await pool.query(`SELECT COUNT(*)::int AS total ${baseFrom}`, values);

    values.push(query.pageSize);
    values.push(offset);

    const result = await pool.query(
      `
      SELECT
        a.id,
        a.asset_tag AS "assetTag",
        a.name,
        a.type,
        a.status,
        a.location,
        NULLIF(a.purchase_date::text, 'infinity') AS "purchaseDate",
        NULLIF(a.warranty_expiry::text, 'infinity') AS "warrantyExpiry",
        a.created_at AS "createdAt",
        a.updated_at AS "updatedAt",
        a.specs,
        latest.employee_name AS "assignedTo",
        latest.employee_id AS "assignedToId",
        latest.employee_department AS "department",
        latest.assigned_at AS "assignedAt"
      ${baseFrom}
      ORDER BY ${sortMap[query.sortField]} ${query.sortDirection.toUpperCase()}, a.id DESC
      LIMIT $${values.length - 1}
      OFFSET $${values.length}
      `,
      values
    );

    res.json({
      rows: result.rows,
      total: countResult.rows[0].total,
      page: query.page,
      pageSize: query.pageSize,
    });
  } catch (error) {
    if (error.name === "ZodError") {
      return res.status(400).json({ message: "Invalid asset list query", errors: error.issues });
    }
    next(error);
  }
});

router.get("/bulk-template", authenticate, authorize("admin"), async (req, res, next) => {
  try {
    const format = String(req.query.format || "csv").toLowerCase();

    if (format === "xlsx") {
      const fileBuffer = buildTemplateXlsxBuffer();
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", "attachment; filename=asset-bulk-upload-template.xlsx");
      return res.send(fileBuffer);
    }

    const csv = buildTemplateCsv();
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=asset-bulk-upload-template.csv");
    return res.send(csv);
  } catch (error) {
    return next(error);
  }
});

router.post("/bulk-upload", authenticate, authorize("admin"), (req, res, next) => {
  upload.single("file")(req, res, async (error) => {
    if (error) {
      if (error.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ message: "File size must be 5MB or less" });
      }
      return res.status(400).json({ message: error.message || "Invalid upload file" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "Upload file is required" });
    }

    const client = await pool.connect();
    try {
      const result = await processBulkAssetUpload({
        client,
        fileBuffer: req.file.buffer,
        fileName: req.file.originalname || "assets-upload",
        user: req.user,
      });

      return res.json({
        ok: true,
        message: "Bulk upload processed",
        ...result,
      });
    } catch (uploadError) {
      if (uploadError instanceof RangeError || /Invalid time value/i.test(String(uploadError?.message || ""))) {
        return res.status(400).json({
          message: "Invalid date value found in upload file. Please use valid Purchase Date / Warranty values.",
        });
      }
      return next(uploadError);
    } finally {
      client.release();
    }
  });
});

router.get("/audits", authenticate, async (req, res, next) => {
  const client = await pool.connect();
  try {
    const query = auditListSchema.parse(req.query);
    await ensureAuditTables(client);

    const values = [];
    const whereClauses = [];

    if (query.search) {
      values.push(`%${query.search}%`);
      whereClauses.push(`(
        a.asset_tag ILIKE $${values.length}
        OR a.name ILIKE $${values.length}
        OR a.type ILIKE $${values.length}
        OR a.location ILIKE $${values.length}
        OR COALESCE(latest.employee_name, '') ILIKE $${values.length}
      )`);
    }

    if (query.type) {
      values.push(query.type);
      whereClauses.push(`a.type = $${values.length}`);
    }

    if (query.location) {
      values.push(`%${query.location}%`);
      whereClauses.push(`a.location ILIKE $${values.length}`);
    }

    if (query.employee) {
      values.push(`%${query.employee}%`);
      whereClauses.push(`COALESCE(latest.employee_name, '') ILIKE $${values.length}`);
    }

    if (query.auditStatus) {
      if (query.auditStatus === "pending") {
        whereClauses.push("aa.id IS NULL");
      } else {
        values.push(query.auditStatus);
        whereClauses.push(`aa.audit_status = $${values.length}`);
      }
    }

    if (req.user.role === "employee") {
      values.push(req.user.id);
      whereClauses.push(`a.status = 'assigned'`);
      whereClauses.push(`latest.employee_id = $${values.length}`);
    }

    const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";

    const baseSql = `
      FROM assets a
      LEFT JOIN (
        SELECT DISTINCT ON (asset_id)
          aa.asset_id,
          aa.employee_id,
          u.name AS employee_name,
          aa.assigned_at
        FROM asset_assignments aa
        INNER JOIN users u ON u.id = aa.employee_id
        WHERE aa.returned_at IS NULL
        ORDER BY aa.asset_id, aa.assigned_at DESC
      ) latest ON latest.asset_id = a.id
      LEFT JOIN asset_audits aa ON aa.asset_id = a.id
      LEFT JOIN users auditor ON auditor.id = aa.auditor_id
      ${whereSql}
    `;

    const result = await client.query(
      `
      SELECT
        a.id AS "assetId",
        aa.id AS "auditId",
        aa.audit_status AS "auditStatus",
        aa.physical_status AS "physicalStatus",
        aa.physical_condition AS "physicalCondition",
        aa.remarks,
        aa.reason,
        aa.responsible_person AS "responsiblePerson",
        NULLIF(aa.target_date::text, 'infinity') AS "targetDate",
        aa.resolution_status AS "resolutionStatus",
        NULLIF(aa.audit_date::text, 'infinity') AS "auditDate",
        aa.compliant,
        aa.updated_at AS "updatedAt",
        auditor.name AS "auditorName"
      ${baseSql}
      ORDER BY a.id ASC
      `,
      values
    );

    const auditIds = result.rows
      .map((row) => Number(row.auditId))
      .filter((value) => Number.isInteger(value) && value > 0);

    let fileRows = [];
    if (auditIds.length) {
      const fileResult = await client.query(
        `
        SELECT
          id,
          audit_id AS "auditId",
          asset_id AS "assetId",
          file_kind AS "fileKind",
          original_name AS "originalName",
          stored_name AS "storedName",
          mime_type AS "mimeType",
          size_bytes AS "sizeBytes",
          created_at AS "createdAt"
        FROM asset_audit_files
        WHERE audit_id = ANY($1::int[])
        ORDER BY id DESC
        `,
        [auditIds]
      );
      fileRows = fileResult.rows;
    }

    const filesByAudit = new Map();
    fileRows.forEach((file) => {
      const list = filesByAudit.get(file.auditId) || [];
      list.push(file);
      filesByAudit.set(file.auditId, list);
    });

    return res.json(
      result.rows.map((row) => ({
        ...row,
        files: filesByAudit.get(row.auditId) || [],
      }))
    );
  } catch (error) {
    if (error.name === "ZodError") {
      return res.status(400).json({ message: "Invalid audit query", errors: error.issues });
    }
    return next(error);
  } finally {
    client.release();
  }
});

router.post("/:id/audit", authenticate, authorize("admin", "auditor"), async (req, res, next) => {
  const client = await pool.connect();
  try {
    const assetId = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(assetId) || assetId <= 0) {
      return res.status(400).json({ message: "Invalid asset id" });
    }

    const payload = auditEntrySchema.parse(req.body || {});
    await ensureAuditTables(client);

    const assetExists = await client.query("SELECT id FROM assets WHERE id = $1", [assetId]);
    if (!assetExists.rows.length) {
      return res.status(404).json({ message: "Asset not found" });
    }

    const result = await client.query(
      `
      INSERT INTO asset_audits
      (asset_id, auditor_id, audit_status, physical_status, physical_condition, remarks, reason, responsible_person, target_date, resolution_status, audit_date, compliant)
      VALUES
      ($1, $2, $3, $4, $5, $6, $7, $8, NULLIF($9, '')::date, $10, $11::date, $12)
      ON CONFLICT (asset_id)
      DO UPDATE SET
        auditor_id = EXCLUDED.auditor_id,
        audit_status = EXCLUDED.audit_status,
        physical_status = EXCLUDED.physical_status,
        physical_condition = EXCLUDED.physical_condition,
        remarks = EXCLUDED.remarks,
        reason = EXCLUDED.reason,
        responsible_person = EXCLUDED.responsible_person,
        target_date = EXCLUDED.target_date,
        resolution_status = EXCLUDED.resolution_status,
        audit_date = EXCLUDED.audit_date,
        compliant = EXCLUDED.compliant,
        updated_at = NOW()
      RETURNING
        id AS "auditId",
        asset_id AS "assetId",
        audit_status AS "auditStatus",
        physical_status AS "physicalStatus",
        physical_condition AS "physicalCondition",
        remarks,
        reason,
        responsible_person AS "responsiblePerson",
        NULLIF(target_date::text, 'infinity') AS "targetDate",
        resolution_status AS "resolutionStatus",
        NULLIF(audit_date::text, 'infinity') AS "auditDate",
        compliant,
        updated_at AS "updatedAt"
      `,
      [
        assetId,
        req.user.id,
        payload.auditStatus,
        payload.physicalStatus,
        payload.physicalCondition,
        payload.remarks || null,
        payload.reason || null,
        payload.responsiblePerson || null,
        payload.targetDate || "",
        payload.resolutionStatus,
        payload.auditDate,
        payload.compliant,
      ]
    );

    return res.json(result.rows[0]);
  } catch (error) {
    if (error.name === "ZodError") {
      return res.status(400).json({ message: "Invalid audit payload", errors: error.issues });
    }
    return next(error);
  } finally {
    client.release();
  }
});

router.post("/:id/audit/evidence", authenticate, authorize("admin", "auditor"), (req, res, next) => {
  auditEvidenceUpload.array("files", 12)(req, res, async (error) => {
    if (error) {
      if (error.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ message: "Each file must be 50MB or less" });
      }
      return res.status(400).json({ message: error.message || "Invalid evidence upload" });
    }

    if (!Array.isArray(req.files) || !req.files.length) {
      return res.status(400).json({ message: "At least one evidence file is required" });
    }

    const client = await pool.connect();
    try {
      const assetId = Number.parseInt(req.params.id, 10);
      if (!Number.isInteger(assetId) || assetId <= 0) {
        req.files.forEach((file) => fs.unlink(file.path, () => {}));
        return res.status(400).json({ message: "Invalid asset id" });
      }

      await client.query("BEGIN");
      await ensureAuditTables(client);

      const assetExists = await client.query("SELECT id, status FROM assets WHERE id = $1", [assetId]);
      if (!assetExists.rows.length) {
        req.files.forEach((file) => fs.unlink(file.path, () => {}));
        await client.query("ROLLBACK");
        return res.status(404).json({ message: "Asset not found" });
      }

      const statusValue = String(assetExists.rows[0].status || "available").toLowerCase();
      const mappedPhysicalStatus = ["assigned", "available", "retired"].includes(statusValue)
        ? statusValue
        : "repair";

      const ensureAuditResult = await client.query(
        `
        INSERT INTO asset_audits
        (asset_id, auditor_id, audit_status, physical_status, physical_condition, audit_date, compliant)
        VALUES
        ($1, $2, 'verified', $3, 'good', CURRENT_DATE, false)
        ON CONFLICT (asset_id) DO UPDATE
          SET updated_at = NOW()
        RETURNING id
        `,
        [assetId, req.user.id, mappedPhysicalStatus]
      );

      const auditId = ensureAuditResult.rows[0].id;
      const insertedFiles = [];

      for (const file of req.files) {
        const fileKind = fileKindFromMime(file.mimetype);
        const insertResult = await client.query(
          `
          INSERT INTO asset_audit_files
          (audit_id, asset_id, uploaded_by, file_kind, original_name, stored_name, mime_type, size_bytes)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING
            id,
            audit_id AS "auditId",
            asset_id AS "assetId",
            file_kind AS "fileKind",
            original_name AS "originalName",
            stored_name AS "storedName",
            mime_type AS "mimeType",
            size_bytes AS "sizeBytes",
            created_at AS "createdAt"
          `,
          [auditId, assetId, req.user.id, fileKind, file.originalname, path.basename(file.filename), file.mimetype, file.size]
        );
        insertedFiles.push(insertResult.rows[0]);
      }

      await client.query("COMMIT");
      return res.status(201).json({ auditId, files: insertedFiles });
    } catch (uploadError) {
      await client.query("ROLLBACK");
      req.files.forEach((file) => fs.unlink(file.path, () => {}));
      return next(uploadError);
    } finally {
      client.release();
    }
  });
});

router.delete("/audit-files/:fileId", authenticate, authorize("admin", "auditor"), async (req, res, next) => {
  const client = await pool.connect();
  try {
    const fileId = Number.parseInt(req.params.fileId, 10);
    if (!Number.isInteger(fileId) || fileId <= 0) {
      return res.status(400).json({ message: "Invalid file id" });
    }

    await ensureAuditTables(client);
    const fileResult = await client.query(
      `
      DELETE FROM asset_audit_files
      WHERE id = $1
      RETURNING id, stored_name AS "storedName"
      `,
      [fileId]
    );

    if (!fileResult.rows.length) {
      return res.status(404).json({ message: "Evidence file not found" });
    }

    const storedName = path.basename(String(fileResult.rows[0].storedName || ""));
    if (storedName) {
      const filePath = path.join(auditUploadRoot, storedName);
      fs.unlink(filePath, () => {});
    }

    return res.json({ message: "Evidence file removed" });
  } catch (error) {
    return next(error);
  } finally {
    client.release();
  }
});

router.get("/audit-files/:fileId/content", authenticate, async (req, res, next) => {
  const client = await pool.connect();
  try {
    const fileId = Number.parseInt(req.params.fileId, 10);
    if (!Number.isInteger(fileId) || fileId <= 0) {
      return res.status(400).json({ message: "Invalid file id" });
    }

    await ensureAuditTables(client);

    const values = [fileId];
    let employeeScope = "";
    if (req.user.role === "employee") {
      values.push(req.user.id);
      employeeScope = `AND latest.employee_id = $2`;
    }

    const result = await client.query(
      `
      SELECT
        f.id,
        f.stored_name AS "storedName",
        f.original_name AS "originalName",
        f.mime_type AS "mimeType"
      FROM asset_audit_files f
      INNER JOIN asset_audits aa ON aa.id = f.audit_id
      INNER JOIN assets a ON a.id = aa.asset_id
      LEFT JOIN (
        SELECT DISTINCT ON (asset_id)
          aa.asset_id,
          aa.employee_id,
          aa.assigned_at
        FROM asset_assignments aa
        WHERE aa.returned_at IS NULL
        ORDER BY aa.asset_id, aa.assigned_at DESC
      ) latest ON latest.asset_id = a.id
      WHERE f.id = $1
      ${employeeScope}
      LIMIT 1
      `,
      values
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: "Evidence file not found" });
    }

    const file = result.rows[0];
    const storedName = path.basename(String(file.storedName || ""));
    const absolutePath = path.join(auditUploadRoot, storedName);
    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ message: "Evidence content missing from storage" });
    }

    res.setHeader("Content-Type", file.mimeType || "application/octet-stream");
    res.setHeader("Content-Disposition", `inline; filename="${String(file.originalName || "evidence").replace(/"/g, "")}"`);
    return res.sendFile(absolutePath);
  } catch (error) {
    return next(error);
  } finally {
    client.release();
  }
});

router.get("/:id", authenticate, async (req, res, next) => {
  try {
    const assetId = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(assetId) || assetId <= 0) {
      return res.status(400).json({ message: "Invalid asset id" });
    }

    const values = [assetId];
    let employeeScope = "";

    if (req.user.role === "employee") {
      values.push(req.user.id);
      employeeScope = `
        AND a.status = 'assigned'
        AND latest.employee_id = $2
      `;
    }

    const result = await pool.query(
      `
      SELECT
        a.id,
        a.asset_tag AS "assetTag",
        a.name,
        a.type,
        a.status,
        a.location,
        NULLIF(a.purchase_date::text, 'infinity') AS "purchaseDate",
        NULLIF(a.warranty_expiry::text, 'infinity') AS "warrantyExpiry",
        a.created_at AS "createdAt",
        a.updated_at AS "updatedAt",
        a.specs,
        latest.employee_name AS "assignedTo",
        latest.employee_id AS "assignedToId",
        latest.employee_department AS "department",
        latest.assigned_at AS "assignedAt"
      FROM assets a
      LEFT JOIN (
        SELECT DISTINCT ON (asset_id)
          aa.asset_id,
          aa.employee_id,
          u.name AS employee_name,
          u.department AS employee_department,
          aa.assigned_at
        FROM asset_assignments aa
        INNER JOIN users u ON u.id = aa.employee_id
        WHERE aa.returned_at IS NULL
        ORDER BY aa.asset_id, aa.assigned_at DESC
      ) latest ON latest.asset_id = a.id
      WHERE a.id = $1
      ${employeeScope}
      LIMIT 1
      `,
      values
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: "Asset not found" });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    return next(error);
  }
});

router.post("/", authenticate, authorize("admin"), async (req, res, next) => {
  try {
    const payload = assetSchema.parse(req.body);
    const result = await pool.query(
      `
      INSERT INTO assets
      (asset_tag, name, type, status, purchase_date, warranty_expiry, location, specs)
      VALUES ($1, $2, $3, 'available', $4, $5, $6, $7)
      RETURNING
        id,
        asset_tag AS "assetTag",
        name,
        type,
        status,
        location,
        NULLIF(purchase_date::text, 'infinity') AS "purchaseDate",
        NULLIF(warranty_expiry::text, 'infinity') AS "warrantyExpiry",
        created_at AS "createdAt",
        updated_at AS "updatedAt",
        specs
      `,
      [
        payload.assetTag,
        payload.name,
        payload.type,
        payload.purchaseDate,
        payload.warrantyExpiry,
        payload.location,
        payload.specs || null,
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.name === "ZodError") {
      return res.status(400).json({ message: "Invalid asset payload", errors: error.issues });
    }
    if (error.code === "23505") {
      return res.status(409).json({ message: "Asset tag must be unique" });
    }
    return next(error);
  }
});

router.post("/add-stock", authenticate, authorize("admin", "it"), async (req, res, next) => {
  const client = await pool.connect();
  try {
    const payload = addStockSchema.parse(req.body);

    if (payload.purchaseDate && !isValidDateString(payload.purchaseDate)) {
      return res.status(400).json({ message: "Purchase date must be a valid YYYY-MM-DD date" });
    }

    if (payload.warrantyExpiry && !isValidDateString(payload.warrantyExpiry)) {
      return res.status(400).json({ message: "Warranty end date must be a valid YYYY-MM-DD date" });
    }

    if (payload.purchaseDate && payload.warrantyExpiry && payload.warrantyExpiry < payload.purchaseDate) {
      return res.status(400).json({ message: "Warranty end date cannot be earlier than purchase date" });
    }

    if (payload.serialNumbers.length && payload.serialNumbers.length > payload.quantity) {
      return res.status(400).json({ message: "Serial numbers cannot exceed quantity" });
    }

    await client.query("BEGIN");
    await ensureStockLogTable(client);

    const prefix = assetPrefixByType[payload.type] || "AST";
    let currentSequence = await getNextAssetSequence(client, prefix);

    const purchaseDate = payload.purchaseDate || new Date().toISOString().slice(0, 10);
    const warrantyExpiry = payload.warrantyExpiry || purchaseDate;

    const createdAssets = [];
    for (let index = 0; index < payload.quantity; index += 1) {
      currentSequence += 1;
      const assetTag = buildAssetTag(prefix, currentSequence);
      const serialNumber = payload.serialNumbers[index] || "";
      const normalizedRemarks = payload.remarks ? `Remarks: ${payload.remarks}` : "";
      const normalizedSerial = serialNumber ? `Serial: ${serialNumber}` : "";
      const specs = [normalizedRemarks, normalizedSerial].filter(Boolean).join(" | ") || null;

      const insertResult = await client.query(
        `
        INSERT INTO assets
          (asset_tag, name, type, status, purchase_date, warranty_expiry, location, specs)
        VALUES
          ($1, $2, $3, 'available', $4, $5, $6, $7)
        RETURNING
          id,
          asset_tag AS "assetTag",
          name,
          type,
          status,
          location,
          NULLIF(purchase_date::text, 'infinity') AS "purchaseDate",
          NULLIF(warranty_expiry::text, 'infinity') AS "warrantyExpiry",
          specs
        `,
        [assetTag, payload.name, payload.type, purchaseDate, warrantyExpiry, payload.location, specs]
      );

      createdAssets.push(insertResult.rows[0]);
    }

    await client.query(
      `
      INSERT INTO asset_stock_logs
      (name, type, quantity, location, vendor, purchase_date, warranty_expiry, unit_cost, default_status, remarks, source, added_by, created_asset_ids)
      VALUES
      ($1, $2, $3, $4, $5, $6, $7, $8, 'available', $9, $10, $11, $12)
      `,
      [
        payload.name,
        payload.type,
        payload.quantity,
        payload.location,
        payload.vendor || null,
        purchaseDate,
        warrantyExpiry,
        payload.unitCost,
        payload.remarks || null,
        payload.source,
        req.user.id,
        createdAssets.map((asset) => asset.id),
      ]
    );

    await client.query("COMMIT");

    return res.status(201).json({
      message: "Stock added successfully",
      quantityAdded: createdAssets.length,
      createdAssets,
      source: payload.source,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    if (error.name === "ZodError") {
      return res.status(400).json({ message: "Invalid stock payload", errors: error.issues });
    }
    if (error.code === "23505") {
      return res.status(409).json({ message: "Failed to generate unique asset tags. Please retry." });
    }
    return next(error);
  } finally {
    client.release();
  }
});

router.put("/:id", authenticate, authorize("admin"), async (req, res, next) => {
  try {
    const payload = assetUpdateSchema.parse(req.body);
    const fields = [];
    const values = [];

    const map = {
      assetTag: "asset_tag",
      name: "name",
      type: "type",
      status: "status",
      location: "location",
      purchaseDate: "purchase_date",
      warrantyExpiry: "warranty_expiry",
      specs: "specs",
    };

    Object.entries(payload).forEach(([key, value]) => {
      fields.push(`${map[key]} = $${fields.length + 1}`);
      values.push(value);
    });

    if (!fields.length) {
      return res.status(400).json({ message: "No fields to update" });
    }

    values.push(req.params.id);

    const query = `
      UPDATE assets
      SET ${fields.join(", ")}, updated_at = NOW()
      WHERE id = $${values.length}
      RETURNING
        id,
        asset_tag AS "assetTag",
        name,
        type,
        status,
        location,
        NULLIF(purchase_date::text, 'infinity') AS "purchaseDate",
        NULLIF(warranty_expiry::text, 'infinity') AS "warrantyExpiry",
        created_at AS "createdAt",
        updated_at AS "updatedAt",
        specs
    `;

    const result = await pool.query(query, values);

    if (!result.rows.length) {
      return res.status(404).json({ message: "Asset not found" });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    if (error.name === "ZodError") {
      return res.status(400).json({ message: "Invalid update payload", errors: error.issues });
    }
    return next(error);
  }
});

router.post("/:id/assign", authenticate, authorize("admin"), async (req, res, next) => {
  const client = await pool.connect();
  try {
    const payload = assignSchema.parse(req.body);
    await client.query("BEGIN");

    const assetResult = await client.query(
      "SELECT id, status FROM assets WHERE id = $1 FOR UPDATE",
      [req.params.id]
    );

    if (!assetResult.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Asset not found" });
    }

    if (assetResult.rows[0].status !== "available") {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Only available assets can be assigned" });
    }

    await client.query(
      `
      INSERT INTO asset_assignments
      (asset_id, employee_id, assigned_by, expected_return_date, notes)
      VALUES ($1, $2, $3, $4, $5)
      `,
      [req.params.id, payload.employeeId, req.user.id, payload.expectedReturnDate, payload.notes || null]
    );

    await client.query("UPDATE assets SET status = 'assigned', updated_at = NOW() WHERE id = $1", [
      req.params.id,
    ]);

    await client.query("COMMIT");
    return res.json({ message: "Asset assigned successfully" });
  } catch (error) {
    await client.query("ROLLBACK");
    if (error.name === "ZodError") {
      return res.status(400).json({ message: "Invalid assignment payload", errors: error.issues });
    }
    return next(error);
  } finally {
    client.release();
  }
});

router.post("/:id/reserve", authenticate, authorize("admin", "it"), async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const assetResult = await client.query(
      "SELECT id, status FROM assets WHERE id = $1 FOR UPDATE",
      [req.params.id]
    );

    if (!assetResult.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Asset not found" });
    }

    if (assetResult.rows[0].status !== "available") {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Only available assets can be reserved" });
    }

    await client.query("UPDATE assets SET status = 'reserved', updated_at = NOW() WHERE id = $1", [
      req.params.id,
    ]);

    await client.query("COMMIT");
    return res.json({ message: "Asset reserved successfully" });
  } catch (error) {
    await client.query("ROLLBACK");
    if (error.code === "23514") {
      return res.status(500).json({ message: "Database status constraint does not include reserved. Please run DB migration." });
    }
    return next(error);
  } finally {
    client.release();
  }
});

router.post("/:id/release", authenticate, authorize("admin", "it"), async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const assetResult = await client.query(
      "SELECT id, status FROM assets WHERE id = $1 FOR UPDATE",
      [req.params.id]
    );

    if (!assetResult.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Asset not found" });
    }

    if (assetResult.rows[0].status !== "reserved") {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Only reserved assets can be released" });
    }

    await client.query("UPDATE assets SET status = 'available', updated_at = NOW() WHERE id = $1", [
      req.params.id,
    ]);

    await client.query("COMMIT");
    return res.json({ message: "Asset released successfully" });
  } catch (error) {
    await client.query("ROLLBACK");
    return next(error);
  } finally {
    client.release();
  }
});

router.post("/:id/return", authenticate, authorize("admin"), async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const assignmentResult = await client.query(
      `
      SELECT id
      FROM asset_assignments
      WHERE asset_id = $1 AND returned_at IS NULL
      ORDER BY assigned_at DESC
      LIMIT 1
      FOR UPDATE
      `,
      [req.params.id]
    );

    if (!assignmentResult.rows.length) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "No active assignment found" });
    }

    await client.query("UPDATE asset_assignments SET returned_at = NOW() WHERE id = $1", [
      assignmentResult.rows[0].id,
    ]);

    await client.query("UPDATE assets SET status = 'available', updated_at = NOW() WHERE id = $1", [
      req.params.id,
    ]);

    await client.query("COMMIT");
    return res.json({ message: "Asset returned successfully" });
  } catch (error) {
    await client.query("ROLLBACK");
    return next(error);
  } finally {
    client.release();
  }
});

router.post("/:id/retire", authenticate, authorize("admin"), async (req, res, next) => {
  try {
    const result = await pool.query(
      "UPDATE assets SET status = 'retired', updated_at = NOW() WHERE id = $1 RETURNING id",
      [req.params.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: "Asset not found" });
    }

    return res.json({ message: "Asset retired successfully" });
  } catch (error) {
    return next(error);
  }
});

router.delete("/:id", authenticate, authorize("admin"), async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const assetCheck = await client.query("SELECT id FROM assets WHERE id = $1 FOR UPDATE", [
      req.params.id,
    ]);

    if (!assetCheck.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Asset not found" });
    }

    await client.query("DELETE FROM maintenance_requests WHERE asset_id = $1", [req.params.id]);
    await client.query("DELETE FROM asset_assignments WHERE asset_id = $1", [req.params.id]);
    await client.query("DELETE FROM assets WHERE id = $1", [req.params.id]);

    await client.query("COMMIT");
    return res.json({ message: "Asset deleted successfully" });
  } catch (error) {
    await client.query("ROLLBACK");
    return next(error);
  } finally {
    client.release();
  }
});

module.exports = router;
