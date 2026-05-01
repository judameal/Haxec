// api/hexagonal.js
import clientPromise from "../lib/mongodb.js";

export default async function handler(req, res) {
  try {
    const client = await clientPromise;
    const db = client.db("haxball");

    const tablaCol   = db.collection("tabla");
    const partidosCol = db.collection("partidos");
    const configCol  = db.collection("config");

    /* ── GET: estado de los hexagonales ── */
    if (req.method === "GET") {
      const hexFinal    = await tablaCol.find({ hex: "final" }).toArray();
      const hexDescenso = await tablaCol.find({ hex: "descenso" }).toArray();
      return res.status(200).json({ hexFinal, hexDescenso });
    }

    /* ── POST: generar hexagonales ── */
    if (req.method === "POST") {
      const cfg = await configCol.findOne({ tipo: "liga" });
      if (cfg && cfg.hexagonalGenerado) {
        return res.status(400).json({ message: "Los hexagonales ya fueron generados" });
      }

      // Obtener tabla ordenada: puntos → DG → GF
      const tabla = await tablaCol.find().toArray();
      tabla.sort((a, b) =>
        (b.PTS - a.PTS) || (b.DG - a.DG) || (b.GF - a.GF)
      );

      if (tabla.length < 6) {
        return res.status(400).json({ message: "Se necesitan al menos 6 equipos para generar hexagonales" });
      }

      // Top 6 → Hexagonal Final | Resto → Hexagonal Descenso
      const hexFinal    = tabla.slice(0, 6);
      const hexDescenso = tabla.slice(6);

      // Marcar a qué hexagonal pertenece cada equipo y guardar PTS de fase 1
      for (const equipo of hexFinal) {
        await tablaCol.updateOne(
          { equipo: equipo.equipo },
          { $set: { hex: "final", PTS_fase1: equipo.PTS } }
        );
      }
      for (const equipo of hexDescenso) {
        await tablaCol.updateOne(
          { equipo: equipo.equipo },
          { $set: { hex: "descenso", PTS_fase1: equipo.PTS } }
        );
      }

      // Generar calendario del hexagonal final
      const partidosHex = generarCalendarioHex(hexFinal, "hexagonal_final");
      const partidosDesc = generarCalendarioHex(hexDescenso, "hexagonal_descenso");

      // Insertar partidos en la colección con fase marcada
      const todosPartidos = [...partidosHex, ...partidosDesc];
      if (todosPartidos.length) {
        await partidosCol.insertMany(todosPartidos);
      }

      // Marcar hexagonal como generado y cambiar fase
      await configCol.updateOne(
        { tipo: "liga" },
        { $set: { hexagonalGenerado: true, fase: "hexagonal_final" } },
        { upsert: true }
      );

      return res.status(200).json({
        message: "Hexagonales generados correctamente",
        hexFinal: hexFinal.map(e => e.equipo),
        hexDescenso: hexDescenso.map(e => e.equipo),
        partidosGenerados: todosPartidos.length
      });
    }

    return res.status(405).json({ message: "Método no permitido" });

  } catch (error) {
    console.error("ERROR /api/hexagonal:", error);
    return res.status(500).json({ message: "Error interno del servidor", error: error.message });
  }
}

/* ── Genera todos contra todos ida y vuelta ── */
function generarCalendarioHex(equipos, fase) {
  const lista = equipos.slice();
  if (lista.length % 2 !== 0) lista.push(null);
  const n = lista.length;
  const jornadas = [];

  for (let i = 0; i < n - 1; i++) {
    const jornada = [];
    for (let j = 0; j < n / 2; j++) {
      const local = lista[j];
      const visitante = lista[n - 1 - j];
      if (local && visitante) {
        jornada.push({ local, visitante });
      }
    }
    jornadas.push(jornada);
    lista.splice(1, 0, lista.pop());
  }

  // Vuelta
  const vuelta = jornadas.map(j =>
    j.map(p => ({ local: p.visitante, visitante: p.local }))
  );

  const todasJornadas = [...jornadas, ...vuelta];

  // Aplanar con índices y fase
  const partidos = [];
  todasJornadas.forEach((jornada, jornadaIdx) => {
    jornada.forEach((p, partidoIdx) => {
      partidos.push({
        fase,
        jornada: jornadaIdx,
        partido: partidoIdx,
        local: {
          nombre: p.local.equipo,
          logo: p.local.logo || ""
        },
        visitante: {
          nombre: p.visitante.equipo,
          logo: p.visitante.logo || ""
        },
        fecha: "",
        hora: "",
        jugado: false
      });
    });
  });

  return partidos;
}