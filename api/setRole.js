import clientPromise from "../lib/mongodb.js";

export default async function handler(req, res) {
  try {
    let body = "";

    await new Promise((resolve) => {
      req.on("data", chunk => body += chunk);
      req.on("end", resolve);
    });

    const { username, role } = JSON.parse(body);

    if (username === "Judameal") {
      return res.status(403).json({ message: "No puedes modificar este usuario" });
    }

    const client = await clientPromise;
    const db = client.db("haxball");

    await db.collection("users").updateOne(
      { username },
      { $set: { role } }
    );

    res.status(200).json({ message: "Rol actualizado" });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}