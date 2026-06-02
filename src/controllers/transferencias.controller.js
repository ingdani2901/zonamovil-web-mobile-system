const pool = require("../config/db");

// 🔍 OBTENER TRANSFERENCIAS
exports.getTransferencias = async (req, res) => {
  try {
    const sucursal = req.user.id_sucursal;

    const result = await pool.query(
      `
            SELECT 
                t.*,
                e.marca, e.modelo,
                so.nombre AS sucursal_origen,
                sd.nombre AS sucursal_destino,
                t.sucursal_destino AS sucursal_destino_id,
                ue.nombre AS envia,
                ur.nombre AS recibe
            FROM transferencias t
            JOIN equipos e ON e.id_equipo = t.id_equipo
            JOIN sucursales so ON so.id_sucursal = t.sucursal_origen
            JOIN sucursales sd ON sd.id_sucursal = t.sucursal_destino
            JOIN usuarios ue ON ue.id_usuario = t.usuario_envia
            LEFT JOIN usuarios ur ON ur.id_usuario = t.usuario_recibe
            WHERE t.sucursal_origen = $1 OR t.sucursal_destino = $1
            ORDER BY t.id_transferencia DESC
        `,
      [sucursal],
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error obteniendo transferencias" });
  }
};

// 📦 CREAR (ENVIAR)
exports.crearTransferencia = async (req, res) => {
  const client = await pool.connect();

  try {
    const { id_equipo, sucursal_destino, observaciones } = req.body;
    const usuario = req.user.id_usuario;
    const sucursal_origen = req.user.id_sucursal;

    if (sucursal_origen == sucursal_destino) {
      return res
        .status(400)
        .json({ error: "No puedes transferir a la misma sucursal" });
    }

    await client.query("BEGIN");

    // 🔥 VALIDAR EQUIPO
    const check = await client.query(
      "SELECT estado, id_sucursal FROM equipos WHERE id_equipo=$1",
      [id_equipo],
    );

    if (check.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Equipo no existe" });
    }

    if (check.rows[0].estado !== "disponible") {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Equipo no disponible" });
    }

    if (check.rows[0].id_sucursal !== sucursal_origen) {
      await client.query("ROLLBACK");
      return res
        .status(403)
        .json({ error: "El equipo no pertenece a tu sucursal" });
    }

    // 🔥 INSERTAR TRANSFERENCIA
    await client.query(
      `
            INSERT INTO transferencias (id_equipo, sucursal_origen, sucursal_destino, usuario_envia, observaciones)
            VALUES ($1, $2, $3, $4, $5)
        `,
      [id_equipo, sucursal_origen, sucursal_destino, usuario, observaciones],
    );

    // 🔥 CAMBIAR ESTADO DEL EQUIPO
    await client.query(
      `
            UPDATE equipos SET estado = 'en_transferencia' WHERE id_equipo = $1
        `,
      [id_equipo],
    );

    // 🔥 MOVIMIENTO
    await client.query(
      `
            INSERT INTO movimientos_equipo (id_equipo, id_usuario, tipo_movimiento, descripcion)
            VALUES ($1, $2, 'transferencia', 'Equipo enviado a otra sucursal')
        `,
      [id_equipo, usuario],
    );

    await client.query("COMMIT");

    res.json({ ok: true });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    res.status(500).json({ error: "Error creando transferencia" });
  } finally {
    client.release();
  }
};

// 📥 RECIBIR
exports.recibirTransferencia = async (req, res) => {
  const client = await pool.connect();

  try {
    const { id } = req.params;
    const usuario_recibe = req.user.id_usuario;
    const sucursal = req.user.id_sucursal;

    await client.query("BEGIN");

    // 1. Actualizar transferencia
    await client.query(
      `
            UPDATE transferencias
            SET estado = 'recibido', usuario_recibe = $1, fecha_recepcion = NOW()
            WHERE id_transferencia = $2
        `,
      [usuario_recibe, id],
    );

    // 2. Obtener equipo
    const equipoRes = await client.query(
      "SELECT id_equipo FROM transferencias WHERE id_transferencia = $1",
      [id],
    );

    const id_equipo = equipoRes.rows[0].id_equipo;

    // 3. Actualizar equipo
    await client.query(
      `
            UPDATE equipos
            SET id_sucursal = $1, estado = 'disponible'
            WHERE id_equipo = $2
        `,
      [sucursal, id_equipo],
    );

    // 4. Movimiento
    await client.query(
      `
            INSERT INTO movimientos_equipo (id_equipo, id_usuario, tipo_movimiento, descripcion)
            VALUES ($1, $2, 'transferencia', 'Equipo recibido en sucursal destino')
        `,
      [id_equipo, usuario_recibe],
    );

    await client.query("COMMIT");

    res.json({ ok: true });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    res.status(500).json({ error: "Error recibiendo transferencia" });
  } finally {
    client.release();
  }
};
