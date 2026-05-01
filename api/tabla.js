// api/tabla.js  (reemplaza el existente)
import clientPromise from "../lib/mongodb.js";

export default async function handler(req, res) {
  try {
    const client = await clientPromise;
    const db = client.db("haxball");

    const tabla = db.collection("tabla");
    const teams = db.collection("teams");

    /* ── GET: obtener tabla ── */
    if (req.method === "GET") {
      const { hex } = req.query;

      // Filtrar por hexagonal si se pasa ?hex=final o ?hex=descenso
      const filtro = hex ? { hex } : {};
      const data = await tabla.find(filtro).toArray();
      return res.status(200).json(data);
    }

    /* ── POST: inicializar tabla desde equipos registrados ── */
    if (req.method === "POST") {
      const equipos = await teams.find().toArray();

      await tabla.deleteMany({});

      const base = equipos.map(e => ({
        equipo: e.nombre,
        logo: e.logo || "",
        PJ: 0,
        G: 0,
        E: 0,
        P: 0,
        GF: 0,
        GC: 0,
        DG: 0,
        PTS: 0,
        hex: null,        // null = fase regular | "final" | "descenso"
        PTS_fase1: 0      // puntos arrastrados de la fase regular
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