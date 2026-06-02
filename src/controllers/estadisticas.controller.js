const pool = require("../config/db");

// =====================================
// OBTENER ESTADÍSTICAS
// =====================================

const getEstadisticas = async (req, res) => {
  const { inicio, fin } = req.query;
  try {
    // =====================================
    // TOTAL VENTAS
    // =====================================

    const ventas = await pool.query(`
      SELECT
        COALESCE(SUM(total),0) AS total_ventas
      FROM ventas
      WHERE estado != 'cancelada'
    `);

    // =====================================
    // TOTAL COMPRAS
    // =====================================

    const compras = await pool.query(`

  SELECT
    COALESCE(SUM(e.precio_compra),0)
    AS total_compras

  FROM detalle_venta dv

  INNER JOIN equipos e
    ON e.id_equipo = dv.id_equipo

  INNER JOIN ventas v
    ON v.id_venta = dv.id_venta

  WHERE v.estado != 'cancelada'

`);

    // =====================================
    // EQUIPOS VENDIDOS
    // =====================================

    const vendidos = await pool.query(`
      SELECT COUNT(*) AS total
      FROM equipos
      WHERE estado = 'vendido'
    `);

    // =====================================
    // APARTADOS PENDIENTES
    // =====================================

    const apartados = await pool.query(`
      SELECT COUNT(*) AS total
      FROM ventas
      WHERE tipo_venta = 'apartado'
      AND estado != 'pagado'
    `);

    // =====================================
    // PRODUCTOS MÁS VENDIDOS
    // =====================================

    const topEquipos = await pool.query(`
      SELECT
        CONCAT(e.marca, ' ', e.modelo) AS equipo,
        COUNT(*) AS vendidos

      FROM detalle_venta dv

      INNER JOIN equipos e
        ON e.id_equipo = dv.id_equipo

      GROUP BY e.marca, e.modelo

      ORDER BY vendidos DESC

      LIMIT 5
    `);

    // =====================================
    // MÉTODOS DE PAGO
    // =====================================

    const metodos = await pool.query(`
      SELECT
        metodo_pago,
        COUNT(*) AS total

      FROM ventas

      GROUP BY metodo_pago
    `);

    // =====================================
    // GANANCIA
    // =====================================

    const totalVentas = parseFloat(ventas.rows[0].total_ventas);

    const totalCompras = parseFloat(compras.rows[0].total_compras);

    const ganancia = totalVentas - totalCompras;

    // =====================================
    // RESPONSE
    // =====================================

    res.json({
      totalVentas,
      totalCompras,
      ganancia,

      equiposVendidos: vendidos.rows[0].total,

      apartadosPendientes: apartados.rows[0].total,

      topEquipos: topEquipos.rows,

      metodos: metodos.rows,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Error obteniendo estadísticas",
    });
  }
};

module.exports = {
  getEstadisticas,
};
