import clientPromise from "../lib/mongodb.js";

export default async function handler(req, res) {
  const client = await clientPromise;
  const db = client.db("haxball");

  const tabla = db.collection("tabla");
  const teams = db.collection("teams");

  // 📥 OBTENER TABLA
  if (req.method === "GET") {
    const data = await tabla.find().toArray();
    return res.json(data);
  }

  // 🔥 CREAR TABLA INICIAL
  if (req.method === "POST") {
    const equipos = await teams.find().toArray();

    if (!equipos.length) {
      return res.status(400).json({ message: "No hay equipos" });
    }

    // limpiar tabla
    await tabla.deleteMany({});

    // crear tabla base
    const nuevaTabla = equipos.map(e => ({
      equipo: e.nombre,
      PJ: 0,
      G: 0,
      E: 0,
      P: 0,
      GF: 0,
      GC: 0,
      DG: 0,
      PTS: 0
    }));

    await tabla.insertMany(nuevaTabla);

    return res.json({ message: "Tabla creada" });
  }

  res.status(405).end();
}