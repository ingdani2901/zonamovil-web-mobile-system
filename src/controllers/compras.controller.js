const pool = require("../config/db");

exports.crearCompra = async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { id_proveedor, equipos } = req.body;

    const id_usuario = req.user.id_usuario;

    // =========================
    // TOTAL
    // =========================

    const total = equipos.reduce(
      (sum, e) => sum + Number(e.precio_compra),

      0,
    );

    // =========================
    // CREAR COMPRA
    // =========================

    const compraRes = await client.query(
      `
            INSERT INTO compras(

                id_proveedor,
                id_usuario,
                total,
                fecha

            )

            VALUES($1,$2,$3,NOW())

            RETURNING id_compra
            `,

      [id_proveedor, id_usuario, total],
    );

    const id_compra = compraRes.rows[0].id_compra;
    const folio = `CMP-${String(id_compra).padStart(6, "0")}`;
    await client.query(
      `
    UPDATE compras
    SET folio = $1
    WHERE id_compra = $2
    `,
      [folio, id_compra],
    );

    // =========================
    // RECORRER EQUIPOS
    // =========================

    for (const e of equipos) {
      // =========================
      // VALIDAR IMEI DUPLICADO
      // =========================

      const imeiExiste = await client.query(
        `
                SELECT numero_imei
                FROM imeis
                WHERE numero_imei = $1
                `,

        [e.imei],
      );

      if (imeiExiste.rows.length > 0) {
        throw new Error(`IMEI duplicado: ${e.imei}`);
      }

      // =========================
      // CREAR PRODUCTO BASE
      // =========================

      const productoRes = await client.query(
        `
                INSERT INTO productos(

                    marca,
                    modelo,
                    color,
                    capacidad

                )

                VALUES($1,$2,$3,$4)

                RETURNING id_producto
                `,

        [e.marca, e.modelo, e.color, e.capacidad],
      );

      const id_producto = productoRes.rows[0].id_producto;
      // =========================
      // DETALLE COMPRA
      // =========================

      await client.query(
        `
    INSERT INTO detalle_compra(

        id_compra,
        id_producto,
        cantidad,
        precio_compra,
        precio_venta

    )

    VALUES($1,$2,$3,$4,$5)
    `,
        [id_compra, id_producto, 1, e.precio_compra, e.precio_venta],
      );

      // =========================
      // CREAR EQUIPO
      // =========================

      const equipoRes = await client.query(
        `
                INSERT INTO equipos(

                    marca,
                    modelo,
                    color,
                    capacidad,
                    tipo_sim,
                    precio_compra,
                    precio_venta,
                    estado,
                    id_sucursal,
                    id_producto

                )

                VALUES(

                    $1,
                    $2,
                    $3,
                    $4,
                    $5,
                    $6,
                    $7,
                    'disponible',
                    $8,
                    $9

                )

                RETURNING id_equipo
                `,

        [
          e.marca,
          e.modelo,
          e.color,
          e.capacidad,
          e.tipo_sim,
          e.precio_compra,
          e.precio_venta,
          e.id_sucursal,
          id_producto,
        ],
      );

      const id_equipo = equipoRes.rows[0].id_equipo;

      // =========================
      // GUARDAR IMEI
      // =========================

      await client.query(
        `
                INSERT INTO imeis(

                    id_equipo,
                    numero_imei

                )

                VALUES($1,$2)
                `,

        [id_equipo, e.imei],
      );
    }

    await client.query("COMMIT");

    res.json({
      ok: true,

      id_compra,
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error(error);

    res.status(500).json({
      error: error.message,
    });
  } finally {
    client.release();
  }
};
exports.obtenerTicketCompra = async (req, res) => {
  try {
    const { id } = req.params;

    const compra = await pool.query(
      `
            SELECT
                c.id_compra,
                c.folio,
                c.fecha,
                c.total,
                p.empresa proveedor,
                u.nombre usuario
            FROM compras c
            LEFT JOIN proveedores p
                ON p.id_proveedor = c.id_proveedor
            LEFT JOIN usuarios u
                ON u.id_usuario = c.id_usuario
            WHERE c.id_compra = $1
            `,
      [id],
    );

    const detalle = await pool.query(
      `
    SELECT

        e.marca,
        e.modelo,
        e.color,
        e.capacidad,
        e.precio_compra,
        e.precio_venta,
        s.nombre AS sucursal,
        i.numero_imei

    FROM detalle_compra dc

    INNER JOIN productos p
        ON p.id_producto = dc.id_producto

    INNER JOIN equipos e
        ON e.id_producto = p.id_producto

    LEFT JOIN imeis i
        ON i.id_equipo = e.id_equipo

    LEFT JOIN sucursales s
        ON s.id_sucursal = e.id_sucursal

    WHERE dc.id_compra = $1
    `,
      [id],
    );

    res.json({
      compra: compra.rows[0],
      detalle: detalle.rows,
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
};
exports.obtenerCompras = async (req, res) => {
  try {
    const compras = await pool.query(`
      
      SELECT

        c.id_compra,
        c.folio,
        c.fecha,
        c.total,
        c.estado,

        p.empresa AS proveedor,

        u.nombre AS usuario

      FROM compras c

      INNER JOIN proveedores p
      ON p.id_proveedor = c.id_proveedor

      INNER JOIN usuarios u
      ON u.id_usuario = c.id_usuario

      ORDER BY c.id_compra DESC

    `);

    res.json(compras.rows);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Error obteniendo compras",
    });
  }
};

exports.cancelarCompra = async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { id } = req.params;

    // 🔥 VALIDAR SI YA ESTÁ CANCELADA

    const compra = await client.query(
      `
      
      SELECT estado
      FROM compras
      WHERE id_compra = $1

    `,
      [id],
    );

    if (compra.rows.length === 0) {
      throw new Error("Compra no encontrada");
    }

    if (compra.rows[0].estado === "cancelada") {
      throw new Error("La compra ya está cancelada");
    }

    // 🔥 CAMBIAR ESTADO

    await client.query(
      `
      
      UPDATE compras
      SET estado = 'cancelada'
      WHERE id_compra = $1

    `,
      [id],
    );

    // 🔥 ELIMINAR EQUIPOS

    // 🔥 MARCAR EQUIPOS COMO CANCELADOS

    await client.query(
      `
    UPDATE equipos
    SET
      eliminado = true,
      estado = 'cancelado'
    WHERE id_producto IN (
        SELECT id_producto
        FROM detalle_compra
        WHERE id_compra = $1
    )
`,
      [id],
    );

    await client.query("COMMIT");

    res.json({
      ok: true,
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error(error);

    res.status(500).json({
      error: error.message,
    });
  } finally {
    client.release();
  }
};
