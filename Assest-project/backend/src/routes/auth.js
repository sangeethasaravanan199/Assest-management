const express = require("express");
const bcrypt = require("bcryptjs");
const { z } = require("zod");
const pool = require("../config/db");
const { signToken } = require("../utils/jwt");

const router = express.Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

router.post("/login", async (req, res, next) => {
  try {
    const payload = loginSchema.parse(req.body);

    const result = await pool.query(
      "SELECT id, name, email, password_hash, role, department FROM users WHERE email = $1",
      [payload.email.toLowerCase()]
    );

    if (!result.rows.length) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = result.rows[0];
    const matches = await bcrypt.compare(payload.password, user.password_hash);

    if (!matches) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = signToken(user);

    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
      },
    });
  } catch (error) {
    if (error.name === "ZodError") {
      return res.status(400).json({ message: "Invalid login payload", errors: error.issues });
    }
    return next(error);
  }
});

module.exports = router;
