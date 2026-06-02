const pool = require("../config/db");

// Obtener clientes
const getClientes = async (req, res) => {
  try {
    const { id_rol, id_sucursal } = req.user;

    let query;

    if (id_rol === 1) {
      // ADMIN ve todos
      query = `
        SELECT c.*, s.nombre AS sucursal
        FROM clientes c
        LEFT JOIN sucursales s ON s.id_sucursal = c.id_sucursal
        ORDER BY c.id_cliente DESC
      `;
    } else {
      // USUARIO solo su sucursal
      query = `
        SELECT c.*, s.nombre AS sucursal
        FROM clientes c
        LEFT JOIN sucursales s ON s.id_sucursal = c.id_sucursal
        WHERE c.id_sucursal = $1
        ORDER BY c.id_cliente DESC
      `;
    }

    const result =
      id_rol === 1
        ? await pool.query(query)
        : await pool.query(query, [id_sucursal]);

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error obteniendo clientes" });
  }
};

// Crear cliente
const createCliente = async (req, res) => {
  try {
    const { nombre, telefono, direccion } = req.body;

    const sucursal = req.user.id_sucursal;

    await pool.query(
      `
  INSERT INTO clientes(nombre, telefono, direccion, id_sucursal)
  VALUES ($1, $2, $3, $4)
`,
      [nombre, telefono, direccion, sucursal],
    );

    res.json({ message: "Cliente creado" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error creando cliente" });
  }
};

// Eliminar cliente
const deleteCliente = async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query("DELETE FROM clientes WHERE id_cliente = $1", [id]);

    res.json({ message: "Cliente eliminado" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error eliminando cliente" });
  }
};
const updateCliente = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, telefono, direccion } = req.body;

    await pool.query(
      `
      UPDATE clientes
      SET nombre=$1, telefono=$2, direccion=$3
      WHERE id_cliente=$4
    `,
      [nombre, telefono, direccion, id],
    );

    res.json({ message: "Cliente actualizado" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error actualizando cliente" });
  }
};

module.exports = {
  getClientes,
  createCliente,
  deleteCliente,
  updateCliente,
};
