const express = require("express");
const router = express.Router();
const controller = require("../controllers/proveedores.controller");
const { verifyToken } = require("../middlewares/auth.middleware");
const pool = require("../config/db");

router.get("/proveedores", verifyToken, controller.getProveedores);
router.post("/proveedores", verifyToken, controller.createProveedor);
router.put("/proveedores/:id", verifyToken, controller.updateProveedor);
router.delete("/proveedores/:id", verifyToken, controller.deleteProveedor);
router.put(
  "/proveedores/restaurar/:id",
  verifyToken,
  controller.restaurarProveedor,
);

module.exports = router;
