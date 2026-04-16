import clientPromise from "../lib/mongodb.js";

export default async function handler(req, res) {
  const client = await clientPromise;
  const db = client.db("haxball");

  const partidos = db.collection("partidos");
  const tabla = db.collection("tabla");
  const jugadores = db.collection("jugadores");

  // 📥 GET
  if (req.method === "GET") {
    const data = await partidos.find().toArray();
    return res.json(data);
  }

  // ➕ CREAR CALENDARIO
  if (req.method === "POST") {
    const { calendario } = req.body;

    await partidos.deleteMany({});
    await partidos.insertMany(calendario);

    return res.json({ message: "Calendario guardado" });
  }

  // ⚽ JUGAR PARTIDO
  if (req.method === "PUT") {
    const { id, resultado, eventos, mvp, notas } = req.body;

    const partido = await partidos.findOne({ _id: id });

    await partidos.updateOne(
      { _id: id },
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

    // 🔥 ACTUALIZAR TABLA
    await actualizarTabla(db, partido, resultado);

    // 🔥 ACTUALIZAR JUGADORES
    await actualizarJugadores(db, eventos, mvp);

    return res.json({ message: "Partido actualizado" });
  }
}
async function actualizarJugadores(db, eventos, mvp) {
  const jugadores = db.collection("jugadores");

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

async function actualizarTabla(db, partido, resultado) {
  const tabla = db.collection("tabla");

  const { local, visitante } = partido;
  const { local: gl, visitante: gv } = resultado;

  const updateEquipo = async (nombre, gf, gc, puntos, gana, empata, pierde) => {
    await tabla.updateOne(
      { equipo: nombre },
      {
        $inc: {
          PJ: 1,
          GF: gf,
          GC: gc,
          DG: gf - gc,
          PTS: puntos,
          G: gana,
          E: empata,
          P: pierde
        }
      }
    );
  };

  if (gl > gv) {
    await updateEquipo(local.nombre, gl, gv, 3, 1, 0, 0);
    await updateEquipo(visitante.nombre, gv, gl, 0, 0, 0, 1);
  } else if (gl < gv) {
    await updateEquipo(local.nombre, gl, gv, 0, 0, 0, 1);
    await updateEquipo(visitante.nombre, gv, gl, 3, 1, 0, 0);
  } else {
    await updateEquipo(local.nombre, gl, gv, 1, 0, 1, 0);
    await updateEquipo(visitante.nombre, gv, gl, 1, 0, 1, 0);
  }
}