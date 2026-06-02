const pool = require("../config/db");

// ================= GET =================
exports.getReparaciones = async (req, res) => {
  try {
    const id_rol = req.user.id_rol;
    const id_sucursal = req.user.id_sucursal;

    let query = `
      SELECT 
        n.id_nota,
        n.folio,
        c.nombre AS cliente,
        c.telefono,
        n.marca,
        n.modelo,
        n.color,
        n.imei_1,
        n.imei_2,
        n.observaciones,
        n.estado,
        n.costo_estimado,
        n.es_garantia,
        n.fecha_ingreso,
        n.eliminado
      FROM notas_reparacion n
      LEFT JOIN clientes c ON c.id_cliente = n.id_cliente
    `;

    if (id_rol !== 1) {
      query += ` WHERE n.id_sucursal = $1`;
    }

    query += ` ORDER BY n.fecha_ingreso DESC`;

    const result =
      id_rol === 1
        ? await pool.query(query)
        : await pool.query(query, [id_sucursal]);

    res.json(result.rows);
  } catch (error) {
    console.error("🔥 ERROR COMPLETO:", error);

    res.status(500).json({
      error: error.message,
    });
  }
};

// ================= POST =================
exports.crearReparacion = async (req, res) => {
  const {
    cliente,
    telefono,
    marca,
    modelo,
    color,
    observaciones,
    estado,
    costo,
    imei1,
    imei2,
  } = req.body;

  try {
    const id_usuario = req.user.id_usuario;
    const id_sucursal = req.user.id_sucursal;

    // ================= VALIDACIONES =================

    if (!cliente || cliente.length < 3) {
      return res.status(400).json({
        error: "Cliente inválido",
      });
    }

    if (!telefono || !/^[0-9]{10}$/.test(telefono)) {
      return res.status(400).json({
        error: "Teléfono inválido",
      });
    }

    if (!marca || marca.length < 2) {
      return res.status(400).json({
        error: "Marca inválida",
      });
    }

    if (!modelo || modelo.length < 2) {
      return res.status(400).json({
        error: "Modelo inválido",
      });
    }

    if (!observaciones || observaciones.length < 5) {
      return res.status(400).json({
        error: "Observaciones inválidas",
      });
    }

    const estadosValidos = [
      "recibido",
      "en_proceso",
      "listo",
      "no_recogido",
      "entregado",
      "destruccion",
      "cancelado",
      "irreparable",
    ];

    if (!estadosValidos.includes(estado)) {
      return res.status(400).json({
        error: "Estado inválido",
      });
    }

    // ================= CLIENTE =================

    let clienteExistente = await pool.query(
      `
      SELECT id_cliente 
      FROM clientes 
      WHERE telefono = $1
    `,
      [telefono],
    );

    let id_cliente;

    if (clienteExistente.rows.length > 0) {
      id_cliente = clienteExistente.rows[0].id_cliente;
    } else {
      const nuevoCliente = await pool.query(
        `
        INSERT INTO clientes (nombre, telefono)
        VALUES ($1, $2)
        RETURNING id_cliente
      `,
        [cliente, telefono],
      );

      id_cliente = nuevoCliente.rows[0].id_cliente;
    }

    // ================= FOLIO =================

    const ultimaNota = await pool.query(`
      SELECT id_nota
      FROM notas_reparacion
      ORDER BY id_nota DESC
      LIMIT 1
    `);

    const siguienteId =
      ultimaNota.rows.length > 0 ? ultimaNota.rows[0].id_nota + 1 : 1;

    const folio = `REP-${String(siguienteId).padStart(5, "0")}`;

    // ================= GARANTÍA AUTOMÁTICA =================

    let garantiaAutomatica = false;

    if (imei1 && imei1.trim() !== "") {
      const garantiaQuery = await pool.query(
        `
        SELECT 
          v.fecha_venta
        FROM imeis i
        JOIN equipos e 
          ON e.id_equipo = i.id_equipo
        JOIN detalle_venta dv 
          ON dv.id_equipo = e.id_equipo
        JOIN ventas v 
          ON v.id_venta = dv.id_venta
        WHERE i.numero_imei = $1
        AND e.estado = 'vendido'
        ORDER BY v.fecha_venta DESC
        LIMIT 1
      `,
        [imei1],
      );

      if (garantiaQuery.rows.length > 0) {
        const fechaVenta = new Date(garantiaQuery.rows[0].fecha_venta);

        const hoy = new Date();

        const diferenciaMeses =
          (hoy.getFullYear() - fechaVenta.getFullYear()) * 12 +
          (hoy.getMonth() - fechaVenta.getMonth());

        if (diferenciaMeses <= 6) {
          garantiaAutomatica = true;
        }
      }
    }

    // ================= INSERT =================

    await pool.query(
      `
      INSERT INTO notas_reparacion
      (
        folio,
        id_cliente,
        id_usuario,
        id_sucursal,
        marca,
        modelo,
        color,
        imei_1,
        imei_2,
        observaciones,
        estado,
        costo_estimado,
        es_garantia,
        fecha_ingreso
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW()
      )
    `,
      [
        folio,
        id_cliente,
        id_usuario,
        id_sucursal,
        marca,
        modelo,
        color || null,
        imei1 || null,
        imei2 || null,
        observaciones,
        estado,
        garantiaAutomatica ? 0 : costo || 0,
        garantiaAutomatica,
      ],
    );

    res.json({
      message: "Reparación creada correctamente",
      garantia: garantiaAutomatica,
      folio,
    });
  } catch (error) {
    console.error("ERROR CREAR:", error);

    res.status(500).json({
      error: error.message,
    });
  }
};
// ================= VALIDAR GARANTÍA IMEI =================

exports.verificarGarantiaIMEI = async (req, res) => {
  try {
    const { imei } = req.params;

    const result = await pool.query(
      `
      SELECT
        e.marca,
        e.modelo,
        e.color,
        v.fecha_venta
      FROM imeis i
      JOIN equipos e
        ON e.id_equipo = i.id_equipo
      JOIN detalle_venta dv
        ON dv.id_equipo = e.id_equipo
      JOIN ventas v
        ON v.id_venta = dv.id_venta
      WHERE i.numero_imei = $1
      AND e.estado = 'vendido'
      ORDER BY v.fecha_venta DESC
      LIMIT 1
    `,
      [imei],
    );

    if (result.rows.length === 0) {
      return res.json({
        garantia: false,
      });
    }

    const equipo = result.rows[0];

    const fechaVenta = new Date(equipo.fecha_venta);

    const hoy = new Date();

    const diferenciaMeses =
      (hoy.getFullYear() - fechaVenta.getFullYear()) * 12 +
      (hoy.getMonth() - fechaVenta.getMonth());

    if (diferenciaMeses <= 6) {
      return res.json({
        garantia: true,
        marca: equipo.marca,
        modelo: equipo.modelo,
        color: equipo.color,
      });
    }

    res.json({
      garantia: false,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Error verificando garantía",
    });
  }
};
