const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const controller = require("../controllers/reparaciones.controller");

const {
  getReparaciones,
  crearReparacion,
} = require("../controllers/reparaciones.controller");
const { verifyToken } = require("../middlewares/auth.middleware");

// 🔐 GET
router.get("/reparaciones", verifyToken, getReparaciones);
router.get(
  "/reparaciones/verificar-imei/:imei",
  verifyToken,
  controller.verificarGarantiaIMEI,
);

// 🔐 POST (crear)
router.post("/reparaciones", verifyToken, crearReparacion);

// 🔐 DELETE
router.delete("/reparaciones/:id", verifyToken, async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query(
      `
  UPDATE notas_reparacion
  SET eliminado = true
  WHERE id_nota = $1
`,
      [id],
    );

    res.json({ message: "Eliminado correctamente" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error eliminando" });
  }
});

// 🔐 UPDATE
router.put("/reparaciones/:id", verifyToken, async (req, res) => {
  const { id } = req.params;
  console.log("🔥 BACK RECIBE:", req.body);

  const {
    cliente,
    telefono,
    marca,
    modelo,
    color,
    observaciones,
    estado,
    costo,
  } = req.body;

  try {
    await pool.query(
      `
  UPDATE notas_reparacion
  SET 
    marca = $1,
    modelo = $2,
    color = $3,
    observaciones = $4,
    estado = $5::estado_reparacion,
    costo_estimado = $6
  WHERE id_nota = $7
`,
      [marca, modelo, color, observaciones, estado, costo, id],
    );

    res.json({ message: "Actualizado correctamente" });
  } catch (error) {
    console.error("🔥 ERROR SQL REAL:", error);
    res.status(500).json({
      error: error.message,
      detalle: error.detail,
    });
  }
});
router.put("/reparaciones/restaurar/:id", verifyToken, async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query(
      `
      UPDATE notas_reparacion
      SET eliminado = false
      WHERE id_nota = $1
    `,
      [id],
    );

    res.json({
      message: "Restaurado correctamente",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Error restaurando",
    });
  }
});

module.exports = router;
