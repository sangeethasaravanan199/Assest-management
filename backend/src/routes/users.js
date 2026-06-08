const express = require("express");
const { z } = require("zod");
const bcrypt = require("bcryptjs");
const pool = require("../config/db");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();

const userCreateSchema = z.object({
  name: z.string().trim().min(2),
  email: z.string().trim().email(),
  password: z.string().min(8),
  department: z.string().trim().min(2),
  role: z.enum(["admin", "auditor", "it", "employee"]).optional().default("employee"),
});

router.get("/", authenticate, authorize("admin"), async (req, res, next) => {
  try {
    const result = await pool.query(
      `
      SELECT
        id,
        name,
        email,
        role,
        department,
        created_at AS "createdAt"
      FROM users
      ORDER BY id DESC
      `
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

router.get("/employees", authenticate, authorize("admin"), async (req, res, next) => {
  try {
    const result = await pool.query(
      "SELECT id, name, email, department FROM users WHERE role = 'employee' ORDER BY name"
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

router.post("/", authenticate, authorize("admin"), async (req, res, next) => {
  try {
    const payload = userCreateSchema.parse(req.body);
    const passwordHash = await bcrypt.hash(payload.password, 10);

    const result = await pool.query(
      `
      INSERT INTO users (name, email, password_hash, role, department)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING
        id,
        name,
        email,
        role,
        department,
        created_at AS "createdAt"
      `,
      [payload.name, payload.email, passwordHash, payload.role, payload.department]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.name === "ZodError") {
      return res.status(400).json({ message: "Invalid user payload", errors: error.issues });
    }
    if (error.code === "23505") {
      return res.status(409).json({ message: "Email already exists" });
    }
    return next(error);
  }
});

router.delete("/:id", authenticate, authorize("admin"), async (req, res, next) => {
  try {
    if (Number(req.params.id) === Number(req.user.id)) {
      return res.status(400).json({ message: "You cannot delete your own account" });
    }

    const result = await pool.query("DELETE FROM users WHERE id = $1 RETURNING id", [req.params.id]);

    if (!result.rows.length) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({ message: "User deleted successfully" });
  } catch (error) {
    if (error.code === "23503") {
      return res.status(400).json({ message: "Cannot delete user with active references" });
    }
    return next(error);
  }
});

module.exports = router;
