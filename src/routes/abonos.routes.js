const express = require("express");
const router = express.Router();

const {
  getAbonos,
  registrarAbono,
  getHistorialAbonos,
} = require("../controllers/abonos.controller");

const { verifyToken } = require("../middlewares/auth.middleware");

// =====================================
// OBTENER ABONOS
// =====================================
router.get("/abonos", verifyToken, getAbonos);

// =====================================
// REGISTRAR ABONO
// =====================================
router.post("/abonos/:id", verifyToken, registrarAbono);
// =====================================
// HISTORIAL DE ABONOS
// =====================================

router.get("/abonos/historial/:id", verifyToken, getHistorialAbonos);

module.exports = router;
