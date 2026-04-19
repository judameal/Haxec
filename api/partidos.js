// api/partidos.js
import clientPromise from "../lib/mongodb.js";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  try {
    const client = await clientPromise;
    const db = client.db("haxball");

    const partidos  = db.collection("partidos");
    const tabla     = db.collection("tabla");
    const jugadores = db.collection("jugadores");

    /* ── GET: listar todos ──────────────────────────────── */
    if (req.method === "GET") {
      const data = await partidos.find().toArray();
      return res.status(200).json(data);
    }

    /* ── POST: guardar horario / importar calendario ────── */
    if (req.method === "POST") {
      const body = req.body;

      // Importar calendario completo
      if (body.calendario) {
        await partidos.deleteMany({});
        await partidos.insertMany(body.calendario);
        return res.status(200).json({ message: "Calendario guardado" });
      }

      // Asignar horario a un partido concreto
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
            fecha:     fecha     || "",
            hora:      hora      || "",
            local:     local     || null,
            visitante: visitante || null,
            jugado: false
          }
        },
        { upsert: true }
      );

      return res.status(200).json({ message: "Horario guardado" });
    }

    /* ── PUT: registrar resultado ───────────────────────── */
    if (req.method === "PUT") {
      const { id, resultado, eventos = [], mvp, notas, local, visitante } = req.body;

      if (!id) {
        return res.status(400).json({ message: "Falta el id del partido" });
      }

      // Buscar partido
      let objectId;
      try {
        objectId = new ObjectId(id);
      } catch (_) {
        return res.status(400).json({ message: "Id inválido" });
      }

      const partido = await partidos.findOne({ _id: objectId });
      if (!partido) {
        return res.status(404).json({ message: "Partido no encontrado" });
      }

      // Si ya estaba jugado, revertir estadísticas anteriores antes de sobreescribir
      if (partido.jugado) {
        await revertirTabla(tabla, partido.local, partido.visitante, partido.resultado);
        await revertirJugadores(jugadores, partido.eventos || [], partido.mvp);
      }

      const equipoLocal     = local     || partido.local;
      const equipoVisitante = visitante || partido.visitante;

      if (!equipoLocal || !equipoVisitante) {
        return res.status(400).json({ message: "Faltan datos del equipo" });
      }

      // Guardar resultado
      await partidos.updateOne(
        { _id: objectId },
        {
          $set: {
            jugado: true,
            local:     equipoLocal,
            visitante: equipoVisitante,
            resultado,
            eventos,
            mvp:   mvp   || "",
            notas: notas || ""
          }
        }
      );

      // Actualizar estadísticas
      await actualizarTabla(tabla, equipoLocal, equipoVisitante, resultado);
      await actualizarJugadores(jugadores, eventos, mvp);

      return res.status(200).json({ message: "Partido guardado correctamente" });
    }

    return res.status(405).json({ message: "Método no permitido" });

  } catch (error) {
    console.error("ERROR /api/partidos:", error);
    return res.status(500).json({ message: "Error interno del servidor", error: error.message });
  }
}

/* ── TABLA: sumar ─────────────────────────────────────────── */
async function actualizarTabla(tabla, local, visitante, resultado) {
  const gl = Number(resultado?.local     ?? 0);
  const gv = Number(resultado?.visitante ?? 0);

  const upd = async (nombre, gf, gc, pts, g, e, p) => {
    await tabla.updateOne(
      { equipo: nombre },
      { $inc: { PJ: 1, G: g, E: e, P: p, GF: gf, GC: gc, DG: gf - gc, PTS: pts } },
      { upsert: true }
    );
  };

  if (gl > gv) {
    await upd(local.nombre,     gl, gv, 3, 1, 0, 0);
    await upd(visitante.nombre, gv, gl, 0, 0, 0, 1);
  } else if (gl < gv) {
    await upd(local.nombre,     gl, gv, 0, 0, 0, 1);
    await upd(visitante.nombre, gv, gl, 3, 1, 0, 0);
  } else {
    await upd(local.nombre,     gl, gv, 1, 0, 1, 0);
    await upd(visitante.nombre, gv, gl, 1, 0, 1, 0);
  }
}

/* ── TABLA: revertir (para re-jugar un partido) ───────────── */
async function revertirTabla(tabla, local, visitante, resultado) {
  if (!local || !visitante || !resultado) return;
  const gl = Number(resultado?.local     ?? 0);
  const gv = Number(resultado?.visitante ?? 0);

  const rev = async (nombre, gf, gc, pts, g, e, p) => {
    await tabla.updateOne(
      { equipo: nombre },
      { $inc: { PJ: -1, G: -g, E: -e, P: -p, GF: -gf, GC: -gc, DG: -(gf - gc), PTS: -pts } }
    );
  };

  if (gl > gv) {
    await rev(local.nombre,     gl, gv, 3, 1, 0, 0);
    await rev(visitante.nombre, gv, gl, 0, 0, 0, 1);
  } else if (gl < gv) {
    await rev(local.nombre,     gl, gv, 0, 0, 0, 1);
    await rev(visitante.nombre, gv, gl, 3, 1, 0, 0);
  } else {
    await rev(local.nombre,     gl, gv, 1, 0, 1, 0);
    await rev(visitante.nombre, gv, gl, 1, 0, 1, 0);
  }
}

/* ── JUGADORES: sumar ─────────────────────────────────────── */
async function actualizarJugadores(jugadores, eventos, mvp) {
  for (const e of eventos) {
    const campo = {
      gol:       "goles",
      asistencia:"asistencias",
      amarilla:  "amarillas",
      roja:      "rojas"
    }[e.tipo];

    if (campo) {
      await jugadores.updateOne(
        { nombre: e.jugador },
        { $inc: { [campo]: 1 } }
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

/* ── JUGADORES: revertir ──────────────────────────────────── */
async function revertirJugadores(jugadores, eventos, mvp) {
  for (const e of eventos) {
    const campo = {
      gol:       "goles",
      asistencia:"asistencias",
      amarilla:  "amarillas",
      roja:      "rojas"
    }[e.tipo];

    if (campo) {
      await jugadores.updateOne(
        { nombre: e.jugador },
        { $inc: { [campo]: -1 } }
      );
    }
  }

  if (mvp) {
    await jugadores.updateOne(
      { nombre: mvp },
      { $inc: { mvp: -1 } }
    );
  }
}