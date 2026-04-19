import clientPromise from "../lib/mongodb.js";

export default async function handler(req, res) {
  try {
    const client = await clientPromise;
    const db = client.db("haxball");

    const tabla = db.collection("tabla");
    const teams = db.collection("teams");

    if (req.method === "GET") {
      const data = await tabla.find().toArray();
      return res.status(200).json(data);
    }

    if (req.method === "POST") {
      const equipos = await teams.find().toArray();

      await tabla.deleteMany({});

      const base = equipos.map(e => ({
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

      if (base.length) {
        await tabla.insertMany(base);
      }

      return res.status(200).json({ message: "Tabla creada" });
    }

    return res.status(405).json({ message: "Método no permitido" });
  } catch (error) {
    console.error("ERROR /api/tabla:", error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
}