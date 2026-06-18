const express = require("express");
const { z } = require("zod");
const pool = require("../config/db");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();

const createMaintenanceSchema = z.object({
  assetId: z.number().int().positive(),
  title: z.string().min(5),
  description: z.string().min(10),
  priority: z.enum(["low", "medium", "high"]),
});

const updateMaintenanceSchema = z.object({
  status: z.enum(["open", "in_progress", "resolved"]),
  cost: z.number().nonnegative().optional(),
});

router.get("/", authenticate, async (req, res, next) => {
  try {
    const values = [];
    let where = "";

    if (req.user.role !== "admin") {
      where = "WHERE mr.requested_by = $1";
      values.push(req.user.id);
    }

    const result = await pool.query(
      `
      SELECT
        mr.id,
        mr.asset_id AS "assetId",
        a.asset_tag AS "assetTag",
        a.name AS "assetName",
        mr.title,
        mr.description,
        mr.priority,
        mr.status,
        mr.cost,
        mr.created_at AS "createdAt",
        mr.resolved_at AS "resolvedAt",
        u.name AS "requestedBy"
      FROM maintenance_requests mr
      INNER JOIN assets a ON a.id = mr.asset_id
      INNER JOIN users u ON u.id = mr.requested_by
      ${where}
      ORDER BY mr.created_at DESC
      `,
      values
    );

    return res.json(result.rows);
  } catch (error) {
    return next(error);
  }
});

router.post("/", authenticate, async (req, res, next) => {
  const client = await pool.connect();
  try {
    const payload = createMaintenanceSchema.parse(req.body);
    await client.query("BEGIN");

    const assetResult = await client.query("SELECT status FROM assets WHERE id = $1 FOR UPDATE", [
      payload.assetId,
    ]);

    if (!assetResult.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Asset not found" });
    }

    if (assetResult.rows[0].status === "retired") {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Retired assets cannot be sent for maintenance" });
    }

    const result = await client.query(
      `
      INSERT INTO maintenance_requests
      (asset_id, requested_by, title, description, status, priority)
      VALUES ($1, $2, $3, $4, 'open', $5)
      RETURNING
        id,
        asset_id AS "assetId",
        title,
        description,
        status,
        priority,
        created_at AS "createdAt"
      `,
      [payload.assetId, req.user.id, payload.title, payload.description, payload.priority]
    );

    if (assetResult.rows[0].status === "available") {
      await client.query("UPDATE assets SET status = 'maintenance', updated_at = NOW() WHERE id = $1", [
        payload.assetId,
      ]);
    }

    await client.query("COMMIT");

    return res.status(201).json(result.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    if (error.name === "ZodError") {
      return res.status(400).json({ message: "Invalid maintenance payload", errors: error.issues });
    }
    return next(error);
  } finally {
    client.release();
  }
});

router.patch("/:id", authenticate, authorize("admin"), async (req, res, next) => {
  const client = await pool.connect();
  try {
    const payload = updateMaintenanceSchema.parse(req.body);
    await client.query("BEGIN");

    const resolvedAt = payload.status === "resolved" ? "NOW()" : "NULL";

    const result = await client.query(
      `
      UPDATE maintenance_requests
      SET status = $1,
          cost = COALESCE($2, cost),
          resolved_at = ${resolvedAt}
      WHERE id = $3
      RETURNING id, asset_id AS "assetId"
      `,
      [payload.status, payload.cost ?? null, req.params.id]
    );

    if (!result.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Maintenance request not found" });
    }

    if (payload.status === "resolved") {
      await client.query(
        "UPDATE assets SET status = CASE WHEN status = 'maintenance' THEN 'available' ELSE status END, updated_at = NOW() WHERE id = $1",
        [result.rows[0].assetId]
      );
    }

    await client.query("COMMIT");

    return res.json({ message: "Maintenance request updated" });
  } catch (error) {
    await client.query("ROLLBACK");
    if (error.name === "ZodError") {
      return res.status(400).json({ message: "Invalid maintenance update", errors: error.issues });
    }
    return next(error);
  } finally {
    client.release();
  }
});

module.exports = router;
