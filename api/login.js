import clientPromise from "../lib/mongodb.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).end();
  }

  const { username, password } = req.body;

  const client = await clientPromise;
  const db = client.db("haxball");
  const users = db.collection("users");

  const user = await users.findOne({ username, password });

  if (!user) {
    return res.status(401).json({ message: "Credenciales incorrectas" });
  }

  res.status(200).json({
    username: user.username,
    role: user.role
  });
}