const express = require("express");
const router = express.Router();

const {
  createVenta,
  getVentaById,
  getVentas,
  cancelarVenta,
} = require("../controllers/ventas.controller");

const { verifyToken } = require("../middlewares/auth.middleware");

// 🔥 CREAR VENTA
router.post("/ventas", verifyToken, createVenta);

// 📋 HISTORIAL VENTAS
router.get("/ventas", verifyToken, getVentas);

// ❌ CANCELAR VENTA
router.put("/ventas/cancelar/:id", verifyToken, cancelarVenta);

// 🔍 OBTENER VENTA POR ID
router.get("/ventas/:id", verifyToken, getVentaById);

module.exports = router;
