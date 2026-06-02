const pool = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await pool.query(
      `
      SELECT 
        u.id_usuario,
        u.nombre,
        u.password,
        u.id_rol,
        u.id_sucursal,
        r.nombre AS rol,
        s.nombre AS sucursal
      FROM usuarios u
      JOIN roles r ON r.id_rol = u.id_rol
      JOIN sucursales s ON s.id_sucursal = u.id_sucursal
      WHERE u.email = $1
    `,
      [email],
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ message: "Usuario no encontrado" });
    }

    const user = result.rows[0];

    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(400).json({ message: "Contraseña incorrecta" });
    }

    // 🔥 TOKEN CORRECTO (NUMÉRICO)
    const token = jwt.sign(
      {
        id_usuario: user.id_usuario,
        id_rol: user.id_rol,
        id_sucursal: user.id_sucursal,
      },
      "secreto_super_seguro",
      { expiresIn: "8h" },
    );

    res.json({
      token,
      user: {
        id_rol: user.id_rol, // 🔥 IMPORTANTE
        id_sucursal: user.id_sucursal, // 🔥 IMPORTANTE
        nombre: user.nombre,
        rol: user.rol,
        sucursal: user.sucursal,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error en el login" });
  }
};

module.exports = { login };
