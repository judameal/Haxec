// api/copas.js
import clientPromise from "../lib/mongodb.js";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  try {
    const client = await clientPromise;
    const db    = client.db("copa_expresso");
    const copas = db.collection("copas");

    /* ── GET: listar todas las copas ────────────────────────── */
    if (req.method === "GET") {
      const data = await copas.find().sort({ createdAt: -1 }).toArray();
      return res.status(200).json(data);
    }

    /* ── POST: guardar copa activa o archivar ───────────────── */
    if (req.method === "POST") {
      const body = req.body;

      // Guardar copa activa (estado en progreso)
      if (body.action === "save") {
        const { selectedTeams, players, bracket } = body;
        const existing = await copas.findOne({ status: "active" });

        if (existing) {
          await copas.updateOne(
            { _id: existing._id },
            { $set: { selectedTeams, players, bracket, updatedAt: new Date() } }
          );
          return res.status(200).json({ message: "Copa actualizada", id: existing._id.toString() });
        } else {
          const result = await copas.insertOne({
            status: "active",
            selectedTeams,
            players,
            bracket,
            createdAt: new Date(),
            updatedAt: new Date()
          });
          return res.status(200).json({ message: "Copa creada", id: result.insertedId.toString() });
        }
      }

      // Archivar copa terminada
      if (body.action === "archive") {
        const { champion, teams, totalGoals, matches, goleadores, edition, date } = body;
        await copas.updateOne(
          { status: "active" },
          {
            $set: {
              status: "finished",
              champion,
              teams,
              totalGoals,
              matches,
              goleadores,
              edition,
              date,
              finishedAt: new Date()
            }
          }
        );
        return res.status(200).json({ message: "Copa archivada" });
      }

      return res.status(400).json({ message: "Acción no válida" });
    }

    /* ── DELETE: eliminar copa del historial ────────────────── */
    if (req.method === "DELETE") {
      const { id } = req.body;
      if (!id) return res.status(400).json({ message: "Falta el id" });

      let objectId;
      try { objectId = new ObjectId(id); }
      catch (_) { return res.status(400).json({ message: "Id inválido" }); }

      await copas.deleteOne({ _id: objectId });
      return res.status(200).json({ message: "Copa eliminada" });
    }

    return res.status(405).json({ message: "Método no permitido" });

  } catch (error) {
    console.error("ERROR /api/copas:", error);
    return res.status(500).json({ message: "Error interno", error: error.message });
  }
}