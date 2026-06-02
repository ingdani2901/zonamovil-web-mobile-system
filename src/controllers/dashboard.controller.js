const pool = require("../config/db");

const getDashboardData = async (req, res) => {
  try {
    const equipos = await pool.query(`
      SELECT COUNT(*) 
      FROM equipos
      WHERE eliminado = false
    `);

    const reparaciones = await pool.query(`
  SELECT COUNT(*) 
  FROM notas_reparacion
  WHERE eliminado = false
  AND estado NOT IN ('entregado','cancelado','destruccion')
`);

    const ventas = await pool.query(`
      SELECT COUNT(*) 
      FROM ventas 
      WHERE DATE(fecha_venta) = CURRENT_DATE
    `);

    const clientes = await pool.query(`
      SELECT COUNT(*) 
      FROM clientes
    `);

    res.json({
      equipos: equipos.rows[0].count,
      reparaciones: reparaciones.rows[0].count,
      ventas: ventas.rows[0].count,
      clientes: clientes.rows[0].count,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Error obteniendo dashboard",
    });
  }
};

module.exports = { getDashboardData };
