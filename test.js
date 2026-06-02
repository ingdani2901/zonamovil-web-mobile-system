const pool = require("./src/config/db");
async function testConexion() {
  try {
    const res = await pool.query("SELECT 1");
    console.log("Conectado:", res.rows);
  } catch (error) {
    console.error("X Error de conexión: ", error);
  }
}
testConexion();
