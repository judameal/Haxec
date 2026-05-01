const API = "/api/index";

// 🔐 LOGIN
async function login() {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;

  if (!username || !password) {
    showMsg("Completa todos los campos", "error");
    return;
  }

  const res = await fetch(API + "?ruta=login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });

  let data;
  try { data = await res.json(); }
  catch { showMsg("Error del servidor", "error"); return; }

  if (res.ok) {
    localStorage.setItem("user", JSON.stringify(data));
    window.location.href = "/haxball.html";
  } else {
    showMsg(data.message || "Credenciales incorrectas", "error");
  }
}

// 📝 REGISTER
async function register() {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;
  const msgBox   = document.getElementById("msgBox");

  if (!username || !password) {
    showMsg("Completa todos los campos", "error");
    return;
  }

  if (password.length < 6) {
    showMsg("La contraseña debe tener al menos 6 caracteres", "error");
    return;
  }

  const res = await fetch(API + "?ruta=register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });

  let data;
  try { data = await res.json(); }
  catch { showMsg("Error del servidor", "error"); return; }

  if (res.ok) {
    showMsg("¡Cuenta creada! Redirigiendo...", "success");
    setTimeout(() => window.location.href = "/haxball.html", 1200);
  } else {
    showMsg(data.message || "Error al registrar", "error");
  }
}

// 🔒 LOGOUT
function logout() {
  localStorage.removeItem("user");
  window.location.href = "/index.html";
}

// 💬 Mostrar mensaje en el card (si existe #msgBox) o alert como fallback
function showMsg(text, type) {
  const box = document.getElementById("msgBox");
  if (box) {
    box.textContent  = text;
    box.className    = "toast-msg " + type;
  } else {
    alert(text);
  }
}