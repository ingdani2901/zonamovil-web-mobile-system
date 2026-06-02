const pool = require("../config/db");

// ✅ GET EQUIPOS
exports.getEquipos = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        e.*,
        s.nombre AS sucursal,
        COALESCE(
          json_agg(i.*) FILTER (WHERE i.id_imei IS NOT NULL),
          '[]'
        ) AS imeis
      FROM equipos e
      LEFT JOIN imeis i ON i.id_equipo = e.id_equipo
      LEFT JOIN sucursales s ON s.id_sucursal = e.id_sucursal
      GROUP BY e.id_equipo, s.nombre
      ORDER BY e.id_equipo DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error("ERROR GET:", error);
    res.status(500).json({ error: "Error obteniendo equipos" });
  }
};

// ✅ CREAR
exports.crearEquipo = async (req, res) => {
  try {
    const {
      marca,
      modelo,
      color,
      capacidad,
      precio_compra,
      precio_venta,
      estado,
      imei1,
      imei2,
      tipo_sim,
    } = req.body;

    const sucursal = req.user.id_sucursal;

    const result = await pool.query(
      `
      INSERT INTO equipos (
        marca, modelo, color, capacidad,
        precio_compra, precio_venta,
        estado, id_sucursal, tipo_sim
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *
    `,
      [
        marca,
        modelo,
        color,
        capacidad,
        precio_compra,
        precio_venta,
        estado,
        sucursal,
        tipo_sim,
      ],
    );

    const equipo = result.rows[0];

    // IMEIs
    if (imei1) {
      await pool.query(
        `
        INSERT INTO imeis (id_equipo, numero_imei)
        VALUES ($1,$2)
      `,
        [equipo.id_equipo, imei1],
      );
    }

    if (imei2) {
      await pool.query(
        `
        INSERT INTO imeis (id_equipo, numero_imei)
        VALUES ($1,$2)
      `,
        [equipo.id_equipo, imei2],
      );
    }

    res.json(equipo);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error creando equipo" });
  }
};

// ✅ UPDATE
exports.actualizarEquipo = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      marca,
      modelo,
      color,
      capacidad,
      precio_compra,
      precio_venta,
      estado,
      imei1,
      imei2,
      tipo_sim,
    } = req.body;

    // 🔥 ACTUALIZAR EQUIPO
    await pool.query(
      `
      UPDATE equipos
      SET 
        marca=$1,
        modelo=$2,
        color=$3,
        capacidad=$4,
        precio_compra=$5,
        precio_venta=$6,
    estado=$7,
tipo_sim=$8
WHERE id_equipo=$9
    `,
      [
        marca,
        modelo,
        color,
        capacidad,
        precio_compra,
        precio_venta,
        estado,
        tipo_sim,
        id,
      ],
    );

    // 🔥 BORRAR IMEIS ANTERIORES
    await pool.query(`DELETE FROM imeis WHERE id_equipo=$1`, [id]);

    // 🔥 INSERTAR NUEVOS
    if (imei1) {
      await pool.query(
        `
        INSERT INTO imeis (id_equipo, numero_imei)
        VALUES ($1,$2)
      `,
        [id, imei1],
      );
    }

    if (imei2) {
      await pool.query(
        `
        INSERT INTO imeis (id_equipo, numero_imei)
        VALUES ($1,$2)
      `,
        [id, imei2],
      );
    }

    res.json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error actualizando equipo" });
  }
};

exports.eliminarEquipo = async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query(`UPDATE equipos SET eliminado = true WHERE id_equipo=$1`, [
      id,
    ]);

    res.json({ ok: true });
  } catch (error) {
    console.error("ERROR DELETE:", error);
    res.status(500).json({ error: "Error eliminando" });
  }
};
exports.restaurarEquipo = async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query(
      `UPDATE equipos SET eliminado = false WHERE id_equipo=$1`,
      [id],
    );

    res.json({ ok: true });
  } catch (error) {
    console.error("ERROR RESTORE:", error);
    res.status(500).json({ error: "Error restaurando" });
  }
};
