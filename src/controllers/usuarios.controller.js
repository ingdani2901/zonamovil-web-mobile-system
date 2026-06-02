const pool = require("../config/db");
const bcrypt = require("bcrypt");

// 🔹 GET usuarios
const getUsuarios = async (req, res) => {
  try {
    const { id_rol } = req.user;

    if (id_rol !== 1) {
      return res.status(403).json({ message: "No autorizado" });
    }

    const result = await pool.query(`
SELECT 
  u.id_usuario,
  u.nombre,
  u.email,
  u.activo,
  u.id_rol,
  u.id_sucursal,
  r.nombre AS rol,
  s.nombre AS sucursal
      FROM usuarios u
      JOIN roles r ON r.id_rol = u.id_rol
      JOIN sucursales s ON s.id_sucursal = u.id_sucursal
      ORDER BY u.id_usuario DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error obteniendo usuarios" });
  }
};

// 🔹 CREAR usuario
const createUsuario = async (req, res) => {
  try {
    const { id_rol } = req.user;

    if (id_rol !== 1) {
      return res.status(403).json({ message: "No autorizado" });
    }

    const { nombre, email, password, id_rol: rol, id_sucursal } = req.body;

    const hash = await bcrypt.hash(password, 10);

    await pool.query(
      `
      INSERT INTO usuarios(nombre, email, password, id_rol, id_sucursal)
      VALUES ($1,$2,$3,$4,$5)
    `,
      [nombre, email, hash, rol, id_sucursal],
    );

    res.json({ message: "Usuario creado" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error creando usuario" });
  }
};

// 🔹 UPDATE usuario
const updateUsuario = async (req, res) => {
  try {
    const { id_rol } = req.user;

    if (id_rol !== 1) {
      return res.status(403).json({ message: "No autorizado" });
    }

    const { id } = req.params;
    const { nombre, email, id_rol: rol, id_sucursal } = req.body;

    const campos = [];
    const valores = [];
    let i = 1;

    if (nombre) {
      campos.push(`nombre=$${i++}`);
      valores.push(nombre);
    }

    if (email) {
      campos.push(`email=$${i++}`);
      valores.push(email);
    }

    if (rol) {
      campos.push(`id_rol=$${i++}`);
      valores.push(rol);
    }

    if (id_sucursal) {
      campos.push(`id_sucursal=$${i++}`);
      valores.push(id_sucursal);
    }

    // 🔥 FIX IMPORTANTE
    if (campos.length === 0) {
      return res
        .status(400)
        .json({ message: "No hay cambios para actualizar" });
    }

    valores.push(id);

    await pool.query(
      `
      UPDATE usuarios
      SET ${campos.join(", ")}
      WHERE id_usuario=$${i}
    `,
      valores,
    );

    res.json({ message: "Usuario actualizado" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error actualizando usuario" });
  }
};

// 🔹 ACTIVAR / DESACTIVAR
const toggleUsuario = async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query(
      `
      UPDATE usuarios
      SET activo = NOT activo
      WHERE id_usuario=$1
    `,
      [id],
    );

    res.json({ message: "Estado actualizado" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error cambiando estado" });
  }
};

module.exports = {
  getUsuarios,
  createUsuario,
  updateUsuario,
  toggleUsuario,
};
