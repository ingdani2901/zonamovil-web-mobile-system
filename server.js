const express = require("express");
const pool = require("./src/config/db");

// IMPORTS
const authRoutes = require("./src/routes/auth.routes");
const dashboardRoutes = require("./src/routes/dashboard.routes");
const reparacionesRoutes = require("./src/routes/reparaciones.routes");
const inventarioRoutes = require("./src/routes/inventario.routes");
const transferenciasRoutes = require("./src/routes/transferencias.routes");
const clientesRoutes = require("./src/routes/clientes.routes");
const sucursalesRoutes = require("./src/routes/sucursales.routes");
const usuariosRoutes = require("./src/routes/usuarios.routes");
const rolesRoutes = require("./src/routes/roles.routes");
const ventasRoutes = require("./src/routes/ventas.routes");
const proveedoresRoutes = require("./src/routes/proveedores.routes");
const comprasRoutes = require("./src/routes/compras.routes");
const abonosRoutes = require("./src/routes/abonos.routes");
const estadisticasRoutes = require("./src/routes/estadisticas.routes");

// 🔍 DEBUG (AHORA SÍ)
console.log("auth:", typeof authRoutes);
console.log("dashboard:", typeof dashboardRoutes);
console.log("reparaciones:", typeof reparacionesRoutes);
console.log("inventario:", typeof inventarioRoutes);
console.log("transferencias:", typeof transferenciasRoutes);
console.log("clientes:", typeof clientesRoutes);
console.log("sucursales:", typeof sucursalesRoutes);
console.log("usuarios:", typeof usuariosRoutes);
console.log("roles:", typeof rolesRoutes);
console.log("ventas:", typeof ventasRoutes);
console.log("proveedores:", typeof proveedoresRoutes);
console.log("compras:", typeof comprasRoutes);
console.log("abonos:", typeof abonosRoutes);
console.log("estadisticas:", typeof estadisticasRoutes);

const app = express();

app.use(express.json());
app.use(express.static("public"));

// Rutas API
app.use("/api", authRoutes);
app.use("/api", dashboardRoutes);
app.use("/api", reparacionesRoutes);
app.use("/api", inventarioRoutes);
app.use("/api", transferenciasRoutes);
app.use("/api", clientesRoutes);
app.use("/api", sucursalesRoutes);
app.use("/api", usuariosRoutes);
app.use("/api", rolesRoutes);
app.use("/api", ventasRoutes);
app.use("/api", proveedoresRoutes);
app.use("/api", comprasRoutes);
app.use("/api", abonosRoutes);
app.use("/api", estadisticasRoutes);

// Ruta prueba
app.get("/", (req, res) => {
  res.send("API Zona Móvil funcionando correctamente");
});

// Test conexión DB
app.get("/test-db", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Error en la base de datos" });
  }
});

app.listen(3000, () => {
  console.log("Servidor corriendo en puerto 3000");
});
