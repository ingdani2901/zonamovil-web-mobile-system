const pool = require("../config/db");
const express = require("express");
const router = express.Router();
const controller = require("../controllers/transferencias.controller");

// 🔥 IMPORTANTE
const { verifyToken } = require("../middlewares/auth.middleware");

router.get("/transferencias", verifyToken, controller.getTransferencias);
router.post("/transferencias", verifyToken, controller.crearTransferencia);
router.put(
  "/transferencias/recibir/:id",
  verifyToken,
  controller.recibirTransferencia,
);

router.get("/transferencias/buscar-equipos", verifyToken, async (req, res) => {
  try {
    const { q } = req.query;
    const { id_sucursal } = req.user;
    if (!q || q.trim() === "") {
      return res.json([]);
    }

    const result = await pool.query(
      `
            SELECT DISTINCT
                e.id_equipo,
                e.marca,
                e.modelo,
                e.color,
                e.capacidad
            FROM equipos e
            LEFT JOIN imeis i ON i.id_equipo = e.id_equipo
            WHERE e.estado = 'disponible'
            AND e.eliminado = false
            AND e.id_sucursal = $2
            AND (
                LOWER(e.marca) LIKE LOWER($1)
                OR LOWER(e.modelo) LIKE LOWER($1)
                OR REPLACE(i.numero_imei, ' ', '') LIKE REPLACE($1, ' ', '')
            )
            LIMIT 20
        `,
      [`%${q}%`, id_sucursal],
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error buscando equipos" });
  }
});

module.exports = router;
