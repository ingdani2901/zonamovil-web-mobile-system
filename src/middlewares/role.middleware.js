function verifyRole(rolesPermitidos = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Token inválido o faltante" });
    }

    const { id_rol } = req.user;

    // rolesPermitidos = [1] o [1,2]
    if (!rolesPermitidos.includes(id_rol)) {
      return res.status(403).json({
        message: "No tienes permiso para acceder a este recurso",
      });
    }

    next();
  };
}

module.exports = { verifyRole };
