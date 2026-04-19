import clientPromise from "../lib/mongodb.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Método no permitido" });
  }

  try {
    const client = await clientPromise;
    const db = client.db("haxball");

    // 🔥 eliminar TODO
    await db.collection("partidos").deleteMany({});
    await db.collection("tabla").deleteMany({});

    // 🔥 reset jugadores
    await db.collection("jugadores").updateMany(
      {},
      {
        $set: {
          goles: 0,
          asistencias: 0,
          amarillas: 0,
          rojas: 0,
          mvp: 0
        }
      }
    );

    return res.status(200).json({
      message: "Liga reiniciada correctamente"
    });

  } catch (error) {
    console.error("RESET ERROR:", error);

    return res.status(500).json({
      message: "Error real en el servidor",
      error: error.message
    });
  }
}