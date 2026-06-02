const pool = require("../config/db");

// =====================================
// OBTENER ABONOS
// =====================================
const getAbonos = async (req, res) => {
  try {
    const result = await pool.query(`
      
      SELECT
        v.id_venta,
        v.folio,
        v.total,
        v.saldo,
        v.estado,
        v.fecha_limite,
        v.fecha_venta,

        c.nombre AS cliente,
        u.nombre AS usuario,

        COALESCE(
          (
            SELECT SUM(a.monto)
            FROM abonos_venta a
            WHERE a.id_venta = v.id_venta
          ),
          0
        ) AS abonado

      FROM ventas v

      LEFT JOIN clientes c
        ON c.id_cliente = v.id_cliente

      LEFT JOIN usuarios u
        ON u.id_usuario = v.id_usuario

      WHERE v.tipo_venta = 'apartado'

      ORDER BY v.id_venta DESC

    `);

    res.json(result.rows);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Error obteniendo abonos",
    });
  }
};

// =====================================
// REGISTRAR NUEVO ABONO
// =====================================
const registrarAbono = async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { id } = req.params;

    const { monto, metodo_pago } = req.body;

    const id_usuario = req.user.id_usuario;

    // =====================================
    // OBTENER VENTA
    // =====================================
    const ventaRes = await client.query(
      `
      
      SELECT *
      FROM ventas
      WHERE id_venta = $1

    `,
      [id],
    );

    if (ventaRes.rows.length === 0) {
      throw new Error("Venta no encontrada");
    }

    const venta = ventaRes.rows[0];

    if (venta.estado === "cancelada") {
      throw new Error("La venta está cancelada");
    }

    if (venta.estado === "pagado") {
      throw new Error("La venta ya está liquidada");
    }

    // =====================================
    // VALIDAR MONTO
    // =====================================
    if (!monto || monto <= 0) {
      throw new Error("Monto inválido");
    }

    if (parseFloat(monto) > parseFloat(venta.saldo)) {
      throw new Error("El abono supera el saldo pendiente");
    }

    // =====================================
    // NUEVO SALDO
    // =====================================
    const nuevoSaldo = parseFloat(venta.saldo) - parseFloat(monto);

    // =====================================
    // GUARDAR ABONO
    // =====================================
    await client.query(
      `
      
      INSERT INTO abonos_venta(
        id_venta,
        monto,
        metodo_pago,
        saldo_restante,
        id_usuario
      )
      VALUES($1,$2,$3,$4,$5)

    `,
      [id, monto, metodo_pago, nuevoSaldo, id_usuario],
    );

    // =====================================
    // ACTUALIZAR VENTA
    // =====================================
    await client.query(
      `
      
      UPDATE ventas
      SET
        saldo = $1,
        estado = $2
      WHERE id_venta = $3

    `,
      [nuevoSaldo, nuevoSaldo <= 0 ? "pagado" : "pendiente", id],
    );

    // =====================================
    // SI YA PAGÓ TODO
    // CAMBIAR EQUIPOS A VENDIDO
    // =====================================
    if (nuevoSaldo <= 0) {
      await client.query(
        `
        
        UPDATE equipos
        SET estado = 'vendido'

        WHERE id_equipo IN (
          SELECT id_equipo
          FROM detalle_venta
          WHERE id_venta = $1
        )

      `,
        [id],
      );
    }

    await client.query("COMMIT");

    res.json({
      message: "Abono registrado correctamente",
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error(error);

    res.status(500).json({
      message: error.message,
    });
  } finally {
    client.release();
  }
};

// =====================================
// HISTORIAL DE ABONOS
// =====================================

const getHistorialAbonos = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `

      SELECT
        a.id_abono,
        a.monto,
        a.metodo_pago,
        a.fecha_abono,
        a.saldo_restante,
        u.nombre AS usuario

      FROM abonos_venta a

      LEFT JOIN usuarios u
        ON u.id_usuario = a.id_usuario

      WHERE a.id_venta = $1

      ORDER BY a.fecha_abono DESC

    `,
      [id],
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Error obteniendo historial",
    });
  }
};

module.exports = {
  getAbonos,
  registrarAbono,
  getHistorialAbonos,
};
