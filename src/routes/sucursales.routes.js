const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const { verifyToken } = require("../middlewares/auth.middleware");

// 🔥 GET SUCURSALES (Corregido para Transferencias)
router.get("/sucursales", verifyToken, async (req, res) => {
  try {
    const { id_sucursal } = req.user; // Obtenemos la sucursal del que hace la petición

    const result = await pool.query(
      `
      SELECT id_sucursal, nombre 
      FROM sucursales 
      WHERE activo = true 
      AND id_sucursal != $1
      ORDER BY nombre ASC
    `,
      [id_sucursal],
    ); // Excluimos su propia sucursal

    res.json(result.rows);
  } catch (error) {
    console.error("Error en GET /sucursales:", error);
    res.status(500).json({ message: "Error obteniendo sucursales" });
  }
});
// 🔥 SUCURSALES PARA COMPRAS
router.get("/sucursales-compras", verifyToken, async (req, res) => {
  try {
    const result = await pool.query(`
      
      SELECT
        id_sucursal,
        nombre
      FROM sucursales
      WHERE activo = true
      ORDER BY nombre ASC

    `);

    res.json(result.rows);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Error obteniendo sucursales",
    });
  }
});

module.exports = router;
