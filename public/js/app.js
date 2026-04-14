const API = "/api";

// 🔐 LOGIN
async function login() {
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  const res = await fetch(API + "/login", {
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
    localStorage.setItem("user", JSON.stringify(data));
    window.location.href = "/index.html";
  } else {
    alert(data.message);
  }
}