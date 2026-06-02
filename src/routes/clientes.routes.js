const express = require("express");
const router = express.Router();
const {
  getClientes,
  createCliente,
  deleteCliente,
  updateCliente,
} = require("../controllers/clientes.controller");
const { verifyToken } = require("../middlewares/auth.middleware");
const pool = require("../config/db");

// Rutas CRUD existentes
router.get("/clientes", verifyToken, getClientes);
router.post("/clientes", verifyToken, createCliente);
router.put("/clientes/:id", verifyToken, updateCliente);
router.delete("/clientes/:id", verifyToken, deleteCliente);

// 🔥 NUEVA RUTA: Buscar clientes (Para Select2)
router.get("/clientes/buscar", verifyToken, async (req, res) => {
  try {
    const { q } = req.query;
    const { id_rol, id_sucursal } = req.user;

    let query = `
            SELECT id_cliente, nombre, telefono 
            FROM clientes 
            WHERE (nombre ILIKE $1 OR telefono ILIKE $1)
        `;
    let params = [`%${q}%`];

    // Si no es admin, solo busca en su sucursal
    if (id_rol !== 1) {
      query += ` AND id_sucursal = $2`;
      params.push(id_sucursal);
    }

    query += ` LIMIT 10`;
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error buscando clientes" });
  }
});

module.exports = router;
