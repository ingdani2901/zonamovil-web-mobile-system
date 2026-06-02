const express = require("express");
const router = express.Router();
const controller = require("../controllers/compras.controller");
const { verifyToken } = require("../middlewares/auth.middleware");
const pool = require("../config/db");

function soloAdmin(req, res, next) {
  if (req.user.id_rol !== 1) {
    return res.status(403).json({
      error: "Acceso denegado",
    });
  }

  next();
}

router.post("/compras", verifyToken, controller.crearCompra);
router.get("/compras", verifyToken, soloAdmin, controller.obtenerCompras);
router.put(
  "/compras/cancelar/:id",
  verifyToken,
  soloAdmin,
  controller.cancelarCompra,
);
router.get("/compras/ticket/:id", verifyToken, controller.obtenerTicketCompra);
router.get("/compras/productos", verifyToken, async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim() === "") {
      return res.json([]);
    }

    const result = await pool.query(
      `
            SELECT
                id_producto,
                CONCAT(
                    marca,
                    ' ',
                    modelo,
                    ' ',
                    color,
                    ' ',
                    capacidad
                ) AS nombre
            FROM productos
            WHERE
                LOWER(marca) LIKE LOWER($1)
                OR LOWER(modelo) LIKE LOWER($1)
            ORDER BY marca
            LIMIT 20
        `,
      [`%${q}%`],
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Error buscando productos",
    });
  }
});
router.get("/compras/validar-imei/:imei", verifyToken, async (req, res) => {
  try {
    const { imei } = req.params;

    const existe = await pool.query(
      `
            SELECT numero_imei
            FROM imeis
            WHERE numero_imei = $1
            `,
      [imei],
    );

    res.json({
      existe: existe.rows.length > 0,
    });
  } catch (error) {
    res.status(500).json({
      error: "Error validando IMEI",
    });
  }
});

module.exports = router;
