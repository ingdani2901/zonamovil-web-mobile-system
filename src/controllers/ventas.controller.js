const pool = require("../config/db");

// =============================
// CREAR VENTA
// =============================
const createVenta = async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const {
      equipos,
      id_cliente,
      tipo_venta,
      abono,
      metodo_pago,
      efectivo_recibido,
    } = req.body;
    if (efectivo_recibido !== undefined && efectivo_recibido < 0) {
      throw new Error("El efectivo recibido no puede ser negativo");
    }

    const id_usuario = req.user.id_usuario;

    // =============================
    // VALIDAR CARRITO
    // =============================
    if (!equipos || equipos.length === 0) {
      throw new Error("No hay equipos en la venta");
    }

    // =============================
    // VALIDAR APARTADO
    // =============================
    if (tipo_venta === "apartado") {
      if (abono < 0) {
        throw new Error("El abono no puede ser negativo");
      }
      if (!id_cliente) {
        throw new Error("Debes seleccionar un cliente para apartado");
      }

      if (!abono || abono <= 0) {
        throw new Error("El abono debe ser mayor a 0");
      }
    }

    let total = 0;
    let id_sucursal = null;

    // =============================
    // VALIDAR EQUIPOS
    // =============================
    for (const item of equipos) {
      const equipoRes = await client.query(
        `
        SELECT
          id_equipo,
          precio_venta,
          estado,
          id_sucursal
        FROM equipos
        WHERE id_equipo = $1
        AND eliminado = false
        `,
        [item.id],
      );

      if (equipoRes.rows.length === 0) {
        throw new Error("Equipo no encontrado");
      }

      const equipo = equipoRes.rows[0];

      if (equipo.estado !== "disponible") {
        throw new Error(`El equipo ${item.nombre} no está disponible`);
      }

      total += parseFloat(equipo.precio_venta);

      if (!id_sucursal) {
        id_sucursal = equipo.id_sucursal;
      }

      if (id_sucursal !== equipo.id_sucursal) {
        throw new Error("No puedes vender equipos de distintas sucursales");
      }
      if (id_sucursal && id_sucursal !== equipo.id_sucursal) {
        throw new Error("No puedes vender equipos de distintas sucursales");
      }
    }

    // =============================
    // CALCULAR SALDO
    // =============================
    let saldo = 0;
    let cambio = 0;
    let estadoVenta = "pagado";
    let fechaLimite = null;

    // =============================
    // CONFIGURAR APARTADO
    // =============================

    if (tipo_venta === "apartado") {
      saldo = total - abono;

      estadoVenta = saldo <= 0 ? "pagado" : "pendiente";

      fechaLimite = new Date();

      fechaLimite.setMonth(fechaLimite.getMonth() + 3);
    }
    // =============================
    // VALIDAR EFECTIVO
    // =============================

    if (metodo_pago === "Efectivo") {
      // =================================
      // CONTADO
      // =================================

      if (tipo_venta === "contado") {
        if (efectivo_recibido === undefined || efectivo_recibido < total) {
          throw new Error("El efectivo recibido es insuficiente");
        }

        cambio = efectivo_recibido - total;
      }

      // =================================
      // APARTADO
      // =================================

      if (tipo_venta === "apartado") {
        if (efectivo_recibido === undefined || efectivo_recibido < abono) {
          throw new Error("El efectivo recibido no cubre el abono");
        }

        cambio = efectivo_recibido - abono;
      }
    }

    // =============================
    // CREAR VENTA
    // =============================
    const ventaRes = await client.query(
      `
      INSERT INTO ventas(
        folio,
        id_cliente,
        id_usuario,
        id_sucursal,
        total,
        tipo_venta,
        saldo,
        estado,
        metodo_pago,
        fecha_limite,
        efectivo_recibido,
        cambio
      )
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      RETURNING id_venta, folio
      `,
      [
        `VTA-${String(Date.now()).slice(-6)}`,
        id_cliente || null,
        id_usuario,
        id_sucursal,
        total,
        tipo_venta,
        saldo,
        estadoVenta,
        metodo_pago,
        fechaLimite,
        metodo_pago === "Efectivo" ? efectivo_recibido : null,
        metodo_pago === "Efectivo" ? cambio : null,
      ],
    );

    const venta = ventaRes.rows[0];

    // =============================
    // DETALLE VENTA
    // =============================
    for (const item of equipos) {
      await client.query(
        `
        INSERT INTO detalle_venta(
          id_venta,
          id_equipo,
          precio_venta,
          cantidad
        )
        VALUES($1,$2,$3,$4)
        `,
        [venta.id_venta, item.id, item.precio, 1],
      );

      // =============================
      // ACTUALIZAR INVENTARIO
      // =============================
      await client.query(
        `
        UPDATE equipos
        SET estado = $1
        WHERE id_equipo = $2
        `,
        [tipo_venta === "apartado" ? "apartado" : "vendido", item.id],
      );
    }

    // =============================
    // REGISTRAR PAGO CONTADO
    // =============================
    if (tipo_venta === "contado") {
      await client.query(
        `
    INSERT INTO pagos_venta(
      id_venta,
      monto,
      metodo_pago,
      fecha_pago
    )
    VALUES($1,$2,$3,NOW())
    `,
        [venta.id_venta, total, metodo_pago],
      );
    }

    // ======================
    // REGISTRAR ABONO
    // ======================
    if (tipo_venta === "apartado") {
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
        [venta.id_venta, abono, metodo_pago, saldo, id_usuario],
      );
    }

    await client.query("COMMIT");

    res.json({
      message: "Venta realizada correctamente",
      id_venta: venta.id_venta,
      folio: venta.folio,
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

// =============================
// TICKET
// =============================
const getVentaById = async (req, res) => {
  try {
    const { id } = req.params;

    const ventaRes = await pool.query(
      `
SELECT
  v.*,
  c.nombre AS cliente,
  u.nombre AS usuario,

  (
    SELECT monto
    FROM abonos_venta
    WHERE id_venta = v.id_venta
    ORDER BY fecha_abono ASC
    LIMIT 1
  ) AS abono_inicial

      FROM ventas v

      LEFT JOIN clientes c
        ON c.id_cliente = v.id_cliente

      LEFT JOIN usuarios u
        ON u.id_usuario = v.id_usuario

      WHERE v.id_venta = $1
      `,
      [id],
    );

    if (ventaRes.rows.length === 0) {
      return res.status(404).json({
        message: "Venta no encontrada",
      });
    }

    const detallesRes = await pool.query(
      `
  SELECT
    d.*,

    e.marca,
    e.modelo,
    e.color,
    e.capacidad,

    i.numero_imei

  FROM detalle_venta d

  JOIN equipos e
    ON e.id_equipo = d.id_equipo

  LEFT JOIN LATERAL (
    SELECT numero_imei
    FROM imeis
    WHERE imeis.id_equipo = e.id_equipo
    LIMIT 1
  ) i ON true

  WHERE d.id_venta = $1
  `,
      [id],
    );

    res.json({
      venta: ventaRes.rows[0],
      detalles: detallesRes.rows,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Error obteniendo ticket",
    });
  }
};
// =============================
// HISTORIAL VENTAS
// =============================
// =============================
// HISTORIAL VENTAS
// =============================
const getVentas = async (req, res) => {
  try {
    const ventas = await pool.query(`

      SELECT
        v.id_venta,
        v.folio,
        v.fecha_venta,
        v.total,
        v.tipo_venta,
        v.estado,
        v.metodo_pago,
        c.nombre AS cliente,
        u.nombre AS usuario

      FROM ventas v

      LEFT JOIN clientes c
        ON c.id_cliente = v.id_cliente

      LEFT JOIN usuarios u
        ON u.id_usuario = v.id_usuario

      ORDER BY v.id_venta DESC

    `);

    for (const venta of ventas.rows) {
      const detalles = await pool.query(
        `

        SELECT
          e.marca,
          e.modelo,
          e.color,
          e.capacidad,
          i.numero_imei,
          dv.precio_venta

        FROM detalle_venta dv

        INNER JOIN equipos e
          ON e.id_equipo = dv.id_equipo

        LEFT JOIN imeis i
          ON i.id_equipo = e.id_equipo

        WHERE dv.id_venta = $1

      `,
        [venta.id_venta],
      );

      venta.detalles = detalles.rows;
    }

    res.json(ventas.rows);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Error al obtener ventas",
    });
  }
};
// =============================
// CANCELAR VENTA
// =============================
const cancelarVenta = async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { id } = req.params;

    // =============================
    // VALIDAR VENTA
    // =============================
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

    if (venta.cancelada)
      if (venta.tipo_venta !== "apartado") {
        throw new Error("Solo se pueden cancelar apartados");
      }

    if (venta.estado === "pagado") {
      throw new Error("No puedes cancelar un apartado liquidado");
    }
    {
      throw new Error("La venta ya fue cancelada");
    }

    // =============================
    // OBTENER EQUIPOS
    // =============================
    const detallesRes = await client.query(
      `
      SELECT id_equipo
      FROM detalle_venta
      WHERE id_venta = $1
      `,
      [id],
    );

    // =============================
    // REGRESAR EQUIPOS A DISPONIBLE
    // =============================
    for (const item of detallesRes.rows) {
      await client.query(
        `
        UPDATE equipos
        SET estado = 'disponible'
        WHERE id_equipo = $1
        `,
        [item.id_equipo],
      );
    }

    // =============================
    // CANCELAR VENTA
    // =============================
    await client.query(
      `
      UPDATE ventas
      SET
        cancelada = true,
        estado = 'cancelada'
      WHERE id_venta = $1
      `,
      [id],
    );

    await client.query("COMMIT");

    res.json({
      message: "Venta cancelada correctamente",
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
module.exports = {
  createVenta,
  getVentaById,
  getVentas,
  cancelarVenta,
};
