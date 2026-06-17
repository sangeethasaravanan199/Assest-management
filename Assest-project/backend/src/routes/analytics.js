const express = require("express");
const pool = require("../config/db");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();

router.get("/summary", authenticate, authorize("admin"), async (req, res, next) => {
  try {
    const [statusResult, typeResult, maintenanceResult] = await Promise.all([
      pool.query("SELECT status, COUNT(*)::int AS count FROM assets GROUP BY status ORDER BY status"),
      pool.query("SELECT type, COUNT(*)::int AS count FROM assets GROUP BY type ORDER BY type"),
      pool.query(
        `
        SELECT
          status,
          COUNT(*)::int AS count,
          COALESCE(SUM(cost), 0)::numeric(10,2) AS total_cost
        FROM maintenance_requests
        GROUP BY status
        ORDER BY status
        `
      ),
    ]);

    const kpiResult = await pool.query(
      `
      SELECT
        (SELECT COUNT(*)::int FROM assets) AS total_assets,
        (SELECT COUNT(*)::int FROM assets WHERE status = 'assigned') AS assigned_assets,
        (SELECT COUNT(*)::int FROM assets WHERE status = 'available') AS available_assets,
        (SELECT COUNT(*)::int FROM assets WHERE status = 'retired') AS retired_assets,
        (SELECT COUNT(*)::int FROM maintenance_requests WHERE status <> 'resolved') AS open_maintenance
      `
    );

    return res.json({
      kpis: kpiResult.rows[0],
      assetsByStatus: statusResult.rows,
      assetsByType: typeResult.rows,
      maintenanceByStatus: maintenanceResult.rows,
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
