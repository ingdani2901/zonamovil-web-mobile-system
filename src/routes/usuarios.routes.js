const express = require("express");
const router = express.Router();
const pool = require("../config/db");

const {
  getUsuarios,
  createUsuario,
  updateUsuario,
  toggleUsuario,
} = require("../controllers/usuarios.controller");

const { verifyToken } = require("../middlewares/auth.middleware");

// ================= CRUD (ADMIN) =================
router.get("/usuarios", verifyToken, getUsuarios);
router.post("/usuarios", verifyToken, createUsuario);
router.put("/usuarios/:id", verifyToken, updateUsuario);
router.put("/usuarios/estado/:id", verifyToken, toggleUsuario);

// ================= SOPORTE =================
// 🔹 usuarios por sucursal (para selects)
router.get("/usuarios/sucursal/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      SELECT id_usuario, nombre
      FROM usuarios
      WHERE id_sucursal = $1 AND activo = true
    `,
      [id],
    );

    res.json(result.rows);
  } catch (error) {
    console.error("ERROR REAL:", error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
