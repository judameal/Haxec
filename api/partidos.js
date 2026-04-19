import clientPromise from "../lib/mongodb.js";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  try {
    const client = await clientPromise;
    const db = client.db("haxball");

    const partidos = db.collection("partidos");
    const tabla = db.collection("tabla");
    const jugadores = db.collection("jugadores");

    if (req.method === "GET") {
      const data = await partidos.find().toArray();
      return res.status(200).json(data);
    }

    if (req.method === "POST") {
      const body = req.body;

      if (body.calendario) {
        await partidos.deleteMany({});
        await partidos.insertMany(body.calendario);
        return res.status(200).json({ message: "Calendario guardado" });
      }

      const { jornada, partido, fecha, hora, local, visitante } = body;

      if (jornada === undefined || partido === undefined) {
        return res.status(400).json({ message: "Datos incompletos" });
      }

      await partidos.updateOne(
        { jornada, partido },
        {
          $set: {
            jornada,
            partido,
            fecha,
            hora,
            local,
            visitante,
            jugado: false
          }
        },
        { upsert: true }
      );

      return res.status(200).json({ message: "Horario guardado" });
    }

    if (req.method === "PUT") {
      const { id, resultado, eventos = [], mvp, notas, local, visitante } = req.body;

      const partido = await partidos.findOne({ _id: new ObjectId(id) });

      if (!partido) {
        return res.status(404).json({ message: "Partido no encontrado" });
      }

      const equipoLocal = local || partido.local;
      const equipoVisitante = visitante || partido.visitante;

      if (!equipoLocal || !equipoVisitante) {
        return res.status(400).json({ message: "Faltan datos del partido" });
      }

      await partidos.updateOne(
        { _id: new ObjectId(id) },
        {
          $set: {
            jugado: true,
            local: equipoLocal,
            visitante: equipoVisitante,
            resultado,
            eventos,
            mvp,
            notas
          }
        }
      );

      await actualizarTabla(tabla, equipoLocal, equipoVisitante, resultado);
      await actualizarJugadores(jugadores, eventos, mvp);

      return res.status(200).json({ message: "Partido jugado" });
    }

    return res.status(405).json({ message: "Método no permitido" });
  } catch (error) {
    console.error("ERROR /api/partidos:", error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
}

async function actualizarTabla(tabla, local, visitante, resultado) {
  const gl = Number(resultado?.local ?? 0);
  const gv = Number(resultado?.visitante ?? 0);

  const update = async (nombre, gf, gc, pts, g, e, p) => {
    await tabla.updateOne(
      { equipo: nombre },
      {
        $inc: {
          PJ: 1,
          G: g,
          E: e,
          P: p,
          GF: gf,
          GC: gc,
          DG: gf - gc,
          PTS: pts
        }
      },
      { upsert: true }
    );
  };

  if (gl > gv) {
    await update(local.nombre, gl, gv, 3, 1, 0, 0);
    await update(visitante.nombre, gv, gl, 0, 0, 0, 1);
  } else if (gl < gv) {
    await update(local.nombre, gl, gv, 0, 0, 0, 1);
    await update(visitante.nombre, gv, gl, 3, 1, 0, 0);
  } else {
    await update(local.nombre, gl, gv, 1, 0, 1, 0);
    await update(visitante.nombre, gv, gl, 1, 0, 1, 0);
  }
}

async function actualizarJugadores(jugadores, eventos, mvp) {
  for (const e of eventos) {
    if (e.tipo === "gol") {
      await jugadores.updateOne(
        { nombre: e.jugador },
        { $inc: { goles: 1 } }
      );

      if (e.asistencia) {
        await jugadores.updateOne(
          { nombre: e.asistencia },
          { $inc: { asistencias: 1 } }
        );
      }
    }

    if (e.tipo === "amarilla") {
      await jugadores.updateOne(
        { nombre: e.jugador },
        { $inc: { amarillas: 1 } }
      );
    }

    if (e.tipo === "roja") {
      await jugadores.updateOne(
        { nombre: e.jugador },
        { $inc: { rojas: 1 } }
      );
    }
  }

  if (mvp) {
    await jugadores.updateOne(
      { nombre: mvp },
      { $inc: { mvp: 1 } }
    );
  }
}