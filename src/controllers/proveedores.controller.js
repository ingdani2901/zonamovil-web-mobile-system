const pool = require("../config/db");

// ==========================================
// GET
// ==========================================
exports.getProveedores = async (req, res) => {
  try {
    const result = await pool.query(`
    SELECT *
    FROM proveedores
    ORDER BY id_proveedor DESC
`);

    res.json(result.rows);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Error obteniendo proveedores",
    });
  }
};

// ==========================================
// CREATE
// ==========================================
exports.createProveedor = async (req, res) => {
  try {
    const { empresa, contacto, telefono, ubicacion } = req.body;

    const result = await pool.query(
      `
            INSERT INTO proveedores(
                empresa,
                contacto,
                telefono,
                ubicacion
            )
            VALUES($1,$2,$3,$4)
            RETURNING *
        `,
      [empresa, contacto, telefono, ubicacion],
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Error creando proveedor",
    });
  }
};

// ==========================================
// UPDATE
// ==========================================
exports.updateProveedor = async (req, res) => {
  try {
    const { id } = req.params;

    const { empresa, contacto, telefono, ubicacion } = req.body;

    await pool.query(
      `
            UPDATE proveedores
            SET
                empresa = $1,
                contacto = $2,
                telefono = $3,
                ubicacion = $4
            WHERE id_proveedor = $5
        `,
      [empresa, contacto, telefono, ubicacion, id],
    );

    res.json({ ok: true });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Error actualizando proveedor",
    });
  }
};

// ==========================================
// DELETE LOGICO
// ==========================================
exports.deleteProveedor = async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query(
      `
            UPDATE proveedores
            SET activo = false
            WHERE id_proveedor = $1
        `,
      [id],
    );

    res.json({ ok: true });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Error eliminando proveedor",
    });
  }
};
// ==========================================
// RESTAURAR
// ==========================================
exports.restaurarProveedor = async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query(
      `
            UPDATE proveedores
            SET activo = true
            WHERE id_proveedor = $1
        `,
      [id],
    );

    res.json({ ok: true });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Error restaurando proveedor",
    });
  }
};
