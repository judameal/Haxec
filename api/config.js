// api/config.js
import clientPromise from "../lib/mongodb.js";

export default async function handler(req, res) {
  try {
    const client = await clientPromise;
    const db = client.db("haxball");
    const config = db.collection("config");

    /* ── GET: obtener configuración actual ── */
    if (req.method === "GET") {
      let cfg = await config.findOne({ tipo: "liga" });
      if (!cfg) {
        cfg = {
          tipo: "liga",
          fase: "regular",           // "regular" | "hexagonal_final" | "hexagonal_descenso"
          hexagonalGenerado: false
        };
        await config.insertOne(cfg);
      }
      return res.status(200).json(cfg);
    }

    /* ── POST: actualizar fase ── */
    if (req.method === "POST") {
      const { fase } = req.body;
      const fasesValidas = ["regular", "hexagonal_final", "hexagonal_descenso"];

      if (!fasesValidas.includes(fase)) {
        return res.status(400).json({ message: "Fase inválida" });
      }

      await config.updateOne(
        { tipo: "liga" },
        { $set: { fase } },
        { upsert: true }
      );

      return res.status(200).json({ message: "Fase actualizada", fase });
    }

    return res.status(405).json({ message: "Método no permitido" });

  } catch (error) {
    console.error("ERROR /api/config:", error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
}