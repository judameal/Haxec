import clientPromise from "../lib/mongodb.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).end();
  }

  const { username, password } = req.body;

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

  res.status(200).json({ message: "Usuario registrado" });
}