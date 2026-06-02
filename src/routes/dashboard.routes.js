const express = require("express");
const router = express.Router();
const pool = require("../config/db"); // 👈 TE FALTABA ESTO
const { getDashboardData } = require("../controllers/dashboard.controller");
const { verifyToken } = require("../middlewares/auth.middleware");

router.get("/dashboard", verifyToken, getDashboardData);

// 🔥 GRÁFICAS

router.get("/dashboard/reparaciones", async (req, res) => {
  const result = await pool.query(`
    SELECT marca, COUNT(*) AS total
    FROM notas_reparacion
    GROUP BY marca
    ORDER BY total DESC
  `);
  res.json(result.rows);
});

router.get("/dashboard/ventas", async (req, res) => {
  const result = await pool.query(`
    SELECT DATE(fecha_venta) as dia, SUM(total) as total
    FROM ventas
    GROUP BY dia
    ORDER BY dia
  `);
  res.json(result.rows);
});

router.get("/dashboard/clientes", async (req, res) => {
  const result = await pool.query(`
    SELECT c.nombre, COUNT(*) as total
    FROM notas_reparacion r
    JOIN clientes c ON c.id_cliente = r.id_cliente
    GROUP BY c.nombre
    ORDER BY total DESC
    LIMIT 5
  `);
  res.json(result.rows);
});

router.get("/dashboard/estados", async (req, res) => {
  const result = await pool.query(`
    SELECT estado, COUNT(*) as total
    FROM equipos
    GROUP BY estado
  `);
  res.json(result.rows);
});

module.exports = router; // 👈 SIEMPRE AL FINAL
