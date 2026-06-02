const express = require("express");

const router = express.Router();

const { getEstadisticas } = require("../controllers/estadisticas.controller");

const { verifyToken } = require("../middlewares/auth.middleware");

// =====================================
// ESTADÍSTICAS
// =====================================

router.get("/estadisticas", verifyToken, getEstadisticas);

module.exports = router;
