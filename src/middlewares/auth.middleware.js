const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];

  if (!authHeader) {
    return res.status(403).json({ message: "Token requerido" });
  }

  const token = authHeader.split(" ")[1];

  jwt.verify(token, "secreto_super_seguro", (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: "Token inválido" });
    }

    req.user = {
      id_usuario: decoded.id_usuario,
      id_rol: decoded.id_rol,
      id_sucursal: decoded.id_sucursal,
    };

    next();
  });
};

module.exports = { verifyToken };
