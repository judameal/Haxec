import clientPromise from "../lib/mongodb.js";

export default async function handler(req, res) {
  const client = await clientPromise;
  const db = client.db("haxball");
  const jugadores = db.collection("jugadores");

  if (req.method === "GET") {
    const data = await jugadores.find().toArray();
    return res.status(200).json(data);
  }

  if (req.method === "POST") {
    let body = "";

    await new Promise((resolve) => {
      req.on("data", chunk => body += chunk);
      req.on("end", resolve);
    });

    const { dorsal, nombre, equipo } = JSON.parse(body);

if (!nombre || !dorsal) {
  return res.status(400).json({ message: "Faltan datos" });
}

await jugadores.insertOne({
  dorsal,
  nombre,
  equipo: equipo || "Sin equipo"
});

    if (!dorsal || !nombre || !equipo) {
      return res.status(400).json({ message: "Faltan datos" });
    }

    await jugadores.insertOne({ dorsal, nombre, equipo });

    return res.status(200).json({ message: "Jugador creado" });
  }

  res.status(405).end();
}