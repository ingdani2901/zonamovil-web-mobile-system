// 🔐 PROTECCIÓN GLOBAL
(function () {
  console.log("AUTH ACTIVADO");

  const token = localStorage.getItem("token");
  const userStr = localStorage.getItem("user");

  // ❌ SIN TOKEN
  if (!token) {
    localStorage.clear();

    return (window.location.href = "login.html");
  }

  let user;

  try {
    user = JSON.parse(userStr);
  } catch {
    localStorage.clear();

    return (window.location.href = "login.html");
  }

  // ❌ USER INVÁLIDO
  if (!user || !user.rol) {
    localStorage.clear();

    return (window.location.href = "login.html");
  }

  // 🔥 VALIDAR TOKEN
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));

    if (!payload.exp || payload.exp * 1000 < Date.now()) {
      localStorage.clear();

      return (window.location.href = "login.html");
    }
  } catch {
    localStorage.clear();

    return (window.location.href = "login.html");
  }
})();

// 🔒 CONTROL DE MENÚS
document.addEventListener("DOMContentLoaded", () => {
  const user = JSON.parse(localStorage.getItem("user"));

  // 🔥 SI NO ES ADMIN
  if (!user.rol || user.rol.toLowerCase().trim() !== "admin") {
    // USUARIOS
    const usuarios = document.querySelector('a[href="usuarios.html"]');

    if (usuarios) usuarios.style.display = "none";

    // PROVEEDORES
    const proveedores = document.querySelector('a[href="proveedores.html"]');

    if (proveedores) proveedores.style.display = "none";

    // COMPRAS
    const compras = document.querySelector('a[href="compras.html"]');

    if (compras) compras.style.display = "none";

    // HISTORIAL COMPRAS
    const historial = document.querySelector('a[href="compras_admin.html"]');

    if (historial) historial.style.display = "none";
    // HISTORIAL VENTAS
    const historialVentas = document.querySelector(
      'a[href="ventas_admin.html"]',
    );

    if (historialVentas) historialVentas.style.display = "none";
  }
});
