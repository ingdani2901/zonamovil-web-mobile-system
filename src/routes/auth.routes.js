const express = require("express");
const router = express.Router();
const { login } = require("../controllers/auth.controller");
const { verifyToken } = require("../middlewares/auth.middleware");

router.post("/login", login);

router.get("/profile", verifyToken, (req, res) => {
  res.json({
    message: "Ruta protegida funcionando",
    user: req.user,
  });
});

module.exports = router;
