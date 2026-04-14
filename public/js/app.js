const API = "/api";

// 🔐 REGISTER
async function register() {
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  const res = await fetch(API + "/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ username, password })
  });

  let data;

  try {
    data = await res.json();
  } catch {
    const text = await res.text();
    console.error("Error servidor:", text);
    alert("Error del servidor");
    return;
  }

  if (res.ok) {
    alert("Usuario registrado correctamente");
    window.location.href = "/login.html";
  } else {
    alert(data.message);
  }
}