const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const inventarioController = require("../controllers/inventario.controller");
const { verifyToken } = require("../middlewares/auth.middleware");

// ==========================================
//           OPERACIONES CRUD BASE
// ==========================================
router.get("/inventario", verifyToken, inventarioController.getEquipos);
router.post("/inventario", verifyToken, inventarioController.crearEquipo);
router.put(
  "/inventario/:id",
  verifyToken,
  inventarioController.actualizarEquipo,
);
router.delete(
  "/inventario/:id",
  verifyToken,
  inventarioController.eliminarEquipo,
);
router.put(
  "/inventario/restaurar/:id",
  verifyToken,
  inventarioController.restaurarEquipo,
);

// ==========================================
//          BUSCADOR INTELIGENTE (POS)
// ==========================================
router.get("/inventario/buscar", verifyToken, async (req, res) => {
  try {
    const { q } = req.query;
    const { id_sucursal } = req.user;

    if (!q || q.trim() === "") {
      return res.json({ results: [] });
    }

    const query = `
            SELECT DISTINCT
                e.id_equipo AS id,
                CONCAT(e.marca, ' ', e.modelo, ' (', e.color, ' ', e.capacidad, ')') AS text,
                e.precio_venta
            FROM equipos e
            LEFT JOIN imeis i ON i.id_equipo = e.id_equipo
            WHERE e.eliminado = false
            AND e.id_sucursal = $2
            AND e.estado = 'disponible'
            AND (
                LOWER(e.marca) LIKE LOWER($1)
                OR LOWER(e.modelo) LIKE LOWER($1)
                OR REPLACE(i.numero_imei, ' ', '') LIKE REPLACE($1, ' ', '')
            )
            LIMIT 20
        `;

    const result = await pool.query(query, [`%${q}%`, id_sucursal]);

    res.json({ results: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error buscando equipos" });
  }
});

// ==========================================
//           EQUIPOS DISPONIBLES
// ==========================================
router.get("/inventario/disponibles", verifyToken, async (req, res) => {
  try {
    const { id_sucursal } = req.user;

    const query = `
            SELECT id_equipo, marca, modelo, color, capacidad, precio_venta, estado, id_sucursal
            FROM equipos
            WHERE estado = 'disponible'
            AND eliminado = false
            AND id_sucursal = $1
        `;

    const result = await pool.query(query, [id_sucursal]);

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error obteniendo equipos disponibles" });
  }
});

// ==========================================
//         TRANSFERENCIAS Y ESTADOS
// ==========================================
router.put("/inventario/transferir/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    const check = await pool.query(
      "SELECT estado FROM equipos WHERE id_equipo = $1",
      [id],
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ message: "Equipo no encontrado" });
    }

    if (check.rows[0].estado !== "disponible") {
      return res
        .status(400)
        .json({ message: "Equipo no disponible para transferencia" });
    }

    await pool.query(
      `
            UPDATE equipos 
            SET estado = 'en_transferencia'
            WHERE id_equipo = $1
        `,
      [id],
    );

    res.json({ ok: true, message: "Equipo marcado como en transferencia" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error actualizando estado" });
  }
});
router.get("/inventario/admin", verifyToken, async (req, res) => {
  try {
    const result = await pool.query(`
            SELECT 
                p.id_producto,
                p.codigo,
                p.marca,
                p.modelo,
                p.color,
                p.capacidad,

                COUNT(e.id_equipo) AS stock_total,

                COUNT(*) FILTER (
                    WHERE e.estado = 'disponible'
                ) AS disponibles,

                COUNT(*) FILTER (
                    WHERE e.estado = 'vendido'
                ) AS vendidos,

                COUNT(*) FILTER (
                    WHERE e.estado = 'apartado'
                ) AS apartados,

                MAX(e.precio_compra) AS precio_compra,
                MAX(e.precio_venta) AS precio_venta

            FROM productos p

            LEFT JOIN equipos e
            ON e.id_producto = p.id_producto
            AND e.eliminado = false

            GROUP BY
                p.id_producto,
                p.codigo,
                p.marca,
                p.modelo,
                p.color,
                p.capacidad

            ORDER BY p.marca
        `);

    res.json(result.rows);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Error inventario admin",
    });
  }
});
router.get("/inventario/imeis/:id_producto", verifyToken, async (req, res) => {
  try {
    const { id_producto } = req.params;

    const result = await pool.query(
      `

            SELECT
                e.id_equipo,
                e.marca,
                e.modelo,
                e.color,
                e.capacidad,
                e.estado,
                e.tipo_sim,
                s.nombre AS sucursal,
                i.numero_imei

            FROM equipos e

            LEFT JOIN imeis i
            ON i.id_equipo = e.id_equipo

            LEFT JOIN sucursales s
            ON s.id_sucursal = e.id_sucursal

            WHERE e.id_producto = $1

            ORDER BY e.id_equipo DESC

        `,
      [id_producto],
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Error obteniendo IMEIs",
    });
  }
});

module.exports = router;
