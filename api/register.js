import clientPromise from "../lib/mongodb.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ message: "Método no permitido" });
    }

    // 🔥 FIX Vercel
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
      return res.status(400).json({ message: "Datos incompletos" });
    }

    const client = await clientPromise;
    const db = client.db("haxball");
    const users = db.collection("users");

    const existing = await users.findOne({ username });

    if (existing) {
      return res.status(400).json({ message: "Usuario ya existe" });
    }

    const role = username === "Judameal" ? "admin" : "user";

    await users.insertOne({ username, password, role });

    return res.status(200).json({ message: "Usuario registrado" });

  } catch (error) {
    console.error("🔥 ERROR REGISTER:", error);

    return res.status(500).json({
      message: "Error del servidor",
      error: error.message
    });
  }
}