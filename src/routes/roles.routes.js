const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const { verifyToken } = require("../middlewares/auth.middleware");

// 🔥 OBTENER ROLES
router.get("/roles", verifyToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id_rol, nombre
      FROM roles
    `);

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error obteniendo roles" });
  }
});

module.exports = router;
