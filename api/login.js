import clientPromise from "../lib/mongodb.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ message: "Método no permitido" });
    }

    // 🔥 Parse manual del body (clave en Vercel)
    let body = "";

    await new Promise((resolve, reject) => {
      req.on("data", chunk => {
        body += chunk;
      });

      req.on("end", resolve);
      req.on("error", reject);
    });

    const { username, password } = JSON.parse(body);

    if (!username || !password) {
      return res.status(400).json({ message: "Faltan datos" });
    }

    const client = await clientPromise;
    const db = client.db("haxball");
    const users = db.collection("users");

    const user = await users.findOne({ username, password });

    if (!user) {
      return res.status(401).json({ message: "Credenciales incorrectas" });
    }

    return res.status(200).json({
      username: user.username,
      role: user.role
    });

  } catch (error) {
    console.error("🔥 ERROR LOGIN:", error);

    return res.status(500).json({
      message: "Error del servidor",
      error: error.message
    });
  }
}