import clientPromise from "../lib/mongodb.js";

export default async function handler(req, res) {
  const client = await clientPromise;
  const db = client.db("haxball");
  const teams = db.collection("teams");

  if (req.method === "GET") {
    const data = await teams.find().toArray();
    return res.status(200).json(data);
  }

  if (req.method === "POST") {
    let body = "";

    await new Promise((resolve) => {
      req.on("data", chunk => body += chunk);
      req.on("end", resolve);
    });

    const { nombre, logo, uniforme, local, visitante } = JSON.parse(body);

    if (!nombre) {
      return res.status(400).json({ message: "Faltan datos" });
    }

    await teams.insertOne({
      nombre,
      logo,
      uniforme,
      local,
      visitante
    });

    return res.status(200).json({ message: "Equipo creado" });
  }

  res.status(405).end();
}