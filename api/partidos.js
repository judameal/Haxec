import clientPromise from "../lib/mongodb.js";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  const client = await clientPromise;
  const db = client.db("haxball");

  const partidos = db.collection("partidos");
  const tabla = db.collection("tabla");
  const jugadores = db.collection("jugadores");

  // 📥 GET
  if (req.method === "GET") {
    const data = await partidos.find().toArray();
    return res.status(200).json(data);
  }

  // ➕ POST (horarios o calendario)
  if (req.method === "POST") {
    const body = req.body;

    if (body.calendario) {
      await partidos.deleteMany({});
      await partidos.insertMany(body.calendario);
      return res.json({ message: "Calendario guardado" });
    }

    const { jornada, partido, fecha, hora } = body;

    await partidos.updateOne(
      { jornada, partido },
      { $set: { jornada, partido, fecha, hora } },
      { upsert: true }
    );

    return res.json({ message: "Horario guardado" });
  }

  // ⚽ JUGAR PARTIDO
  if (req.method === "PUT") {
    const { id, resultado, eventos, mvp, notas } = req.body;

    const partido = await partidos.findOne({ _id: new ObjectId(id) });

    await partidos.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          jugado: true,
          resultado,
          eventos,
          mvp,
          notas
        }
      }
    );

    await actualizarTabla(tabla, partido, resultado);
    await actualizarJugadores(jugadores, eventos, mvp);

    return res.json({ message: "Partido jugado" });
  }

  res.status(405).end();
}

/* 🔥 TABLA */
async function actualizarTabla(tabla, partido, resultado) {
  const { local, visitante } = partido;
  const { local: gl, visitante: gv } = resultado;

  const update = async (nombre, gf, gc, pts, g, e, p) => {
    await tabla.updateOne(
      { equipo: nombre },
      {
        $inc: {
          PJ: 1,
          GF: gf,
          GC: gc,
          DG: gf - gc,
          PTS: pts,
          G: g,
          E: e,
          P: p
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

/* 👤 JUGADORES */
async function actualizarJugadores(jugadores, eventos, mvp) {
  for (let e of eventos) {
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