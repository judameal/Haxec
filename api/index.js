// api/index.js  — router único (Vercel Hobby: 1 función)
import clientPromise from "../lib/mongodb.js";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  // CORS básico
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  // Leer body si viene en el request
  if (!req.body) {
    await new Promise((resolve) => {
      let raw = "";
      req.on("data", chunk => raw += chunk);
      req.on("end", () => {
        try { req.body = JSON.parse(raw); } catch (_) { req.body = {}; }
        resolve();
      });
    });
  }

  // Ruta: viene de ?ruta=xxx  o  de la URL  /api/xxx
  const ruta = (req.query.ruta || "").toLowerCase();

  try {
    if (ruta === "login") return await handleLogin(req, res);
    if (ruta === "register") return await handleRegister(req, res);
    if (ruta === "users") return await handleUsers(req, res);
    if (ruta === "deleteuser") return await handleDeleteUser(req, res);
    if (ruta === "setrole") return await handleSetRole(req, res);
    if (ruta === "teams") return await handleTeams(req, res);
    if (ruta === "tabla") return await handleTabla(req, res);
    if (ruta === "partidos") return await handlePartidos(req, res);
    if (ruta === "copa_partidos") return await handleTournamentPartidos(req, res, "copa_ecuador_partidos", "copa");
    if (ruta === "supercopa_partidos") return await handleTournamentPartidos(req, res, "supercopa_partidos", "supercopa");
    if (ruta === "jugadores") return await handleJugadores(req, res);
    if (ruta === "reset") return await handleReset(req, res);
    if (ruta === "config") return await handleConfig(req, res);
    if (ruta === "hexagonal") return await handleHexagonal(req, res);
    if (ruta === "copas") return await handleCopas(req, res);

    return res.status(404).json({ message: "Ruta no encontrada: " + ruta });
  } catch (error) {
    console.error("CRITICAL ERROR /api [" + ruta + "]:", error);
    return res.status(500).json({ 
      message: "Error interno del servidor", 
      error: error.message,
      path: ruta 
    });
  }
}

/* ════════════════════════════════════════════════════
   AUTH
════════════════════════════════════════════════════ */
async function handleLogin(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ message: "Faltan datos" });

  const db = await getDb("haxball");
  const user = await db.collection("users").findOne({ username, password });
  if (!user) return res.status(401).json({ message: "Credenciales incorrectas" });

  return res.status(200).json({ username: user.username, role: user.role });
}

async function handleRegister(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ message: "Datos incompletos" });

  const db = await getDb("haxball");
  const existing = await db.collection("users").findOne({ username });
  if (existing) return res.status(400).json({ message: "Usuario ya existe" });

  const role = username === "Judameal" ? "admin" : "user";
  await db.collection("users").insertOne({ username, password, role });
  return res.status(200).json({ message: "Usuario registrado" });
}

async function handleUsers(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  const db = await getDb("haxball");
  const users = await db.collection("users").find().toArray();
  return res.status(200).json(users);
}

async function handleDeleteUser(req, res) {
  if (req.method !== "DELETE" && req.method !== "POST") return res.status(405).end();
  const { username } = req.body;
  if (username === "Judameal") return res.status(403).json({ message: "No puedes eliminar este usuario" });

  const db = await getDb("haxball");
  await db.collection("users").deleteOne({ username });
  return res.status(200).json({ message: "Usuario eliminado" });
}

async function handleSetRole(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { username, role } = req.body;
  if (username === "Judameal") return res.status(403).json({ message: "No puedes modificar este usuario" });

  const db = await getDb("haxball");
  await db.collection("users").updateOne({ username }, { $set: { role } });
  return res.status(200).json({ message: "Rol actualizado" });
}

/* ════════════════════════════════════════════════════
   TEAMS
════════════════════════════════════════════════════ */
async function handleTeams(req, res) {
  const db = await getDb("haxball");
  const teams = db.collection("teams");

  if (req.method === "GET") {
    const data = await teams.find().toArray();
    return res.status(200).json(data);
  }

  if (req.method === "POST") {
    const { nombre, logo, local, visitante } = req.body;
    await teams.insertOne({ nombre, logo, local, visitante });
    return res.status(200).json({ message: "Equipo creado" });
  }

  if (req.method === "DELETE") {
    const { id } = req.body;
    await teams.deleteOne({ _id: new ObjectId(id) });
    return res.status(200).json({ message: "Eliminado" });
  }

  return res.status(405).end();
}

/* ════════════════════════════════════════════════════
   TABLA
════════════════════════════════════════════════════ */
async function handleTabla(req, res) {
  const db = await getDb("haxball");
  const tabla = db.collection("tabla");
  const teams = db.collection("teams");

  if (req.method === "GET") {
    const { hex } = req.query;
    const filtro = hex ? { hex } : {};
    const data = await tabla.find(filtro).toArray();
    return res.status(200).json(data);
  }

  if (req.method === "POST") {
    const equipos = await teams.find().toArray();
    await tabla.deleteMany({});

    const base = equipos.map(e => ({
      equipo: e.nombre,
      logo: e.logo || "",
      PJ: 0, G: 0, E: 0, P: 0, GF: 0, GC: 0, DG: 0, PTS: 0,
      hex: null,
      PTS_fase1: 0
    }));

    if (base.length) await tabla.insertMany(base);
    return res.status(200).json({ message: "Tabla creada" });
  }

  return res.status(405).end();
}

/* ════════════════════════════════════════════════════
   PARTIDOS
════════════════════════════════════════════════════ */
async function handlePartidos(req, res) {
  const db = await getDb("haxball");
  const partidos = db.collection("partidos");
  const tabla = db.collection("tabla");
  const jugadores = db.collection("jugadores");

  /* GET */
  if (req.method === "GET") {
    const data = await partidos.find().toArray();
    return res.status(200).json(data);
  }

  /* POST: guardar horario o importar calendario */
  if (req.method === "POST") {
    const body = req.body;

    if (body.calendario) {
      await partidos.deleteMany({});
      await partidos.insertMany(body.calendario);
      return res.status(200).json({ message: "Calendario guardado" });
    }

    const { jornada, partido, fecha, hora, local, visitante } = body;
    if (jornada === undefined || partido === undefined)
      return res.status(400).json({ message: "Datos incompletos" });

    await partidos.updateOne(
      { jornada, partido },
      { $set: { jornada, partido, fecha: fecha || "", hora: hora || "", local: local || null, visitante: visitante || null, jugado: false } },
      { upsert: true }
    );
    return res.status(200).json({ message: "Horario guardado" });
  }

  /* PUT: registrar resultado */
  if (req.method === "PUT") {
    const { id, resultado, eventos = [], mvp, notas, local, visitante } = req.body;
    if (!id) return res.status(400).json({ message: "Falta el id del partido" });

    let objectId;
    try { objectId = new ObjectId(id); }
    catch (_) { return res.status(400).json({ message: "Id inválido" }); }

    const partido = await partidos.findOne({ _id: objectId });
    if (!partido) return res.status(404).json({ message: "Partido no encontrado" });

    if (partido.jugado) {
      await revertirTabla(tabla, partido.local, partido.visitante, partido.resultado);
      await revertirJugadores(jugadores, partido.eventos || [], partido.mvp);
    }

    const equipoLocal = local || partido.local;
    const equipoVisitante = visitante || partido.visitante;

    if (!equipoLocal?.nombre || !equipoVisitante?.nombre)
      return res.status(400).json({ message: "Faltan datos del equipo (nombre requerido)" });

    await partidos.updateOne(
      { _id: objectId },
      { $set: { jugado: true, local: equipoLocal, visitante: equipoVisitante, resultado, eventos, mvp: mvp || "", notas: notas || "" } }
    );

    await actualizarTabla(tabla, equipoLocal, equipoVisitante, resultado);
    await actualizarJugadores(jugadores, eventos, mvp, "liga");

    return res.status(200).json({ message: "Partido guardado correctamente" });
  }

  return res.status(405).end();
}

/* ════════════════════════════════════════════════════
   JUGADORES
════════════════════════════════════════════════════ */
async function handleJugadores(req, res) {
  const db = await getDb("haxball");
  const jugadores = db.collection("jugadores");

  if (req.method === "GET") {
    const data = await jugadores.find().toArray();
    return res.status(200).json(data);
  }

  if (req.method === "POST") {
    const { dorsal, nombre, equipo, foto } = req.body;
    if (!dorsal || !nombre) return res.status(400).json({ message: "Faltan datos" });

    await jugadores.insertOne({
      dorsal, nombre,
      equipo: equipo || "Sin equipo",
      foto: foto || "",
      goles: 0, 
      goles_liga: 0, 
      goles_copa: 0, 
      goles_supercopa: 0,
      asistencias: 0,
      asistencias_liga: 0,
      asistencias_copa: 0,
      asistencias_supercopa: 0,
      amarillas: 0,
      amarillas_liga: 0,
      amarillas_copa: 0,
      amarillas_supercopa: 0,
      rojas: 0,
      rojas_liga: 0,
      rojas_copa: 0,
      rojas_supercopa: 0,
      mvp: 0,
      mvp_liga: 0,
      mvp_copa: 0,
      mvp_supercopa: 0,
      vallas_imbatidas: 0, grl: null
    });
    return res.status(200).json({ message: "Jugador creado" });
  }

  if (req.method === "PUT") {
    const { id, nombre, dorsal, equipo, foto } = req.body;
    await jugadores.updateOne(
      { _id: new ObjectId(id) },
      { $set: { nombre, dorsal, equipo, foto } }
    );
    return res.status(200).json({ message: "Jugador actualizado" });
  }

  if (req.method === "DELETE") {
    const { id } = req.body;
    await jugadores.deleteOne({ _id: new ObjectId(id) });
    return res.status(200).json({ message: "Jugador eliminado" });
  }

  return res.status(405).end();
}

/* ════════════════════════════════════════════════════
   RESET
════════════════════════════════════════════════════ */
async function handleReset(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const db = await getDb("haxball");

  await db.collection("partidos").deleteMany({});
  await db.collection("copa_ecuador_partidos").deleteMany({});
  await db.collection("supercopa_partidos").deleteMany({});
  await db.collection("tabla").deleteMany({});
  await db.collection("config").updateOne({ tipo: "liga" }, { $set: { fase: "regular", hexagonalGenerado: false } });
  await db.collection("jugadores").updateMany({}, {
    $set: {
      goles: 0, goles_liga: 0, goles_copa: 0, goles_supercopa: 0,
      asistencias: 0, asistencias_liga: 0, asistencias_copa: 0, asistencias_supercopa: 0,
      amarillas: 0, amarillas_liga: 0, amarillas_copa: 0, amarillas_supercopa: 0,
      rojas: 0, rojas_liga: 0, rojas_copa: 0, rojas_supercopa: 0,
      mvp: 0, mvp_liga: 0, mvp_copa: 0, mvp_supercopa: 0
    }
  });

  return res.status(200).json({ message: "Liga y Torneos reiniciados correctamente" });
}

async function handleTournamentPartidos(req, res, collectionName, torneoKey) {
  const db = await getDb("haxball");
  const col = db.collection(collectionName);
  const jugCol = db.collection("jugadores");

  if (req.method === "GET") {
    const data = await col.find().toArray();
    return res.status(200).json(data);
  }

  if (req.method === "POST") {
    if (req.body.bracket) {
      await col.deleteMany({});
      if (req.body.bracket.length) await col.insertMany(req.body.bracket);
      return res.status(200).json({ message: "Torneo generado" });
    }
  }

  if (req.method === "PUT") {
    const { id, resultado, eventos = [], mvp, local, visitante, fecha, hora, soloHorario } = req.body;
    const objectId = new ObjectId(id);
    
    if (soloHorario) {
      await col.updateOne({ _id: objectId }, { $set: { fecha, hora } });
      return res.status(200).json({ message: "Horario actualizado" });
    }

    const partido = await col.findOne({ _id: objectId });
    if (!partido) return res.status(404).json({ message: "Partido no encontrado" });

    if (partido.jugado) {
      await revertirJugadores(jugCol, partido.eventos || [], partido.mvp, torneoKey);
    }

    await col.updateOne(
      { _id: objectId },
      { $set: { jugado: true, resultado, eventos, mvp: mvp || "", local, visitante } }
    );

    await actualizarJugadores(jugCol, eventos, mvp, torneoKey);

    // --- LÓGICA DE AVANCE (Sólo si hay ganador claro) ---
    const gl = Number(resultado.local);
    const gv = Number(resultado.visitante);
    if (gl !== gv) {
      const ganador = gl > gv ? local : visitante;
      let siguienteRonda = "";
      if (partido.round === "dieciseisavos") siguienteRonda = "octavos";
      else if (partido.round === "octavos") siguienteRonda = "cuartos";
      else if (partido.round === "cuartos") siguienteRonda = "semis";
      else if (partido.round === "semis") siguienteRonda = "final";

      if (siguienteRonda) {
        const siguientePos = Math.floor(partido.pos / 2);
        const campoEquipo = (partido.pos % 2 === 0) ? "local" : "visitante";
        // Propagar nombre Y logo del ganador al siguiente partido
        const ganadorData = { nombre: ganador.nombre, logo: ganador.logo || "" };
        await col.updateOne(
          { round: siguienteRonda, pos: siguientePos },
          { $set: { [campoEquipo]: ganadorData } }
        );
      }
    }

    return res.status(200).json({ message: "Resultado guardado y bracket actualizado" });
  }

  return res.status(405).end();
}

/* ════════════════════════════════════════════════════
   CONFIG
════════════════════════════════════════════════════ */
async function handleConfig(req, res) {
  const db = await getDb("haxball");
  const config = db.collection("config");

  if (req.method === "GET") {
    let cfg = await config.findOne({ tipo: "liga" });
    if (!cfg) {
      cfg = { tipo: "liga", fase: "regular", hexagonalGenerado: false };
      await config.insertOne(cfg);
    }
    return res.status(200).json(cfg);
  }

  if (req.method === "POST") {
    const { fase } = req.body;
    const fasesValidas = ["regular", "hexagonal_final", "hexagonal_descenso"];
    if (!fasesValidas.includes(fase))
      return res.status(400).json({ message: "Fase inválida" });

    await config.updateOne({ tipo: "liga" }, { $set: { fase } }, { upsert: true });
    return res.status(200).json({ message: "Fase actualizada", fase });
  }

  return res.status(405).end();
}

/* ════════════════════════════════════════════════════
   HEXAGONAL
════════════════════════════════════════════════════ */
async function handleHexagonal(req, res) {
  const db = await getDb("haxball");
  const tablaCol = db.collection("tabla");
  const partidosCol = db.collection("partidos");
  const configCol = db.collection("config");

  if (req.method === "GET") {
    const hexFinal = await tablaCol.find({ hex: "final" }).toArray();
    const hexDescenso = await tablaCol.find({ hex: "descenso" }).toArray();
    return res.status(200).json({ hexFinal, hexDescenso });
  }

  if (req.method === "POST") {
    const cfg = await configCol.findOne({ tipo: "liga" });
    if (cfg && cfg.hexagonalGenerado)
      return res.status(400).json({ message: "Los hexagonales ya fueron generados" });

    const tabla = await tablaCol.find().toArray();
    tabla.sort((a, b) => (b.PTS - a.PTS) || (b.DG - a.DG) || (b.GF - a.GF));

    if (tabla.length < 6)
      return res.status(400).json({ message: "Se necesitan al menos 6 equipos" });

    const hexFinal = tabla.slice(0, 6); // Puestos 1-6
    const hexDescenso = tabla.slice(9); // Puestos 10-16

    // Limpiar estados anteriores para que nadie se quede en una fase que no le toca
    await tablaCol.updateMany({}, { $set: { hex: null } });

    for (const e of hexFinal) await tablaCol.updateOne({ equipo: e.equipo }, { $set: { hex: "final", PTS_fase1: e.PTS } });
    for (const e of hexDescenso) await tablaCol.updateOne({ equipo: e.equipo }, { $set: { hex: "descenso", PTS_fase1: e.PTS } });

    const todosPartidos = [
      ...generarCalendarioHex(hexFinal, "hexagonal_final"),
      ...generarCalendarioHex(hexDescenso, "hexagonal_descenso")
    ];

    if (todosPartidos.length) await partidosCol.insertMany(todosPartidos);

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

  return res.status(405).end();
}

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
      if (local && visitante) jornada.push({ local, visitante });
    }
    jornadas.push(jornada);
    lista.splice(1, 0, lista.pop());
  }

  const vuelta = jornadas.map(j => j.map(p => ({ local: p.visitante, visitante: p.local })));
  const todas = [...jornadas, ...vuelta];
  const result = [];

  todas.forEach((jornada, jornadaIdx) => {
    jornada.forEach((p, partidoIdx) => {
      result.push({
        fase,
        jornada: jornadaIdx,
        partido: partidoIdx,
        local: { nombre: p.local.equipo },
        visitante: { nombre: p.visitante.equipo },
        fecha: "", hora: "", jugado: false
      });
    });
  });

  return result;
}

/* ════════════════════════════════════════════════════
   COPAS
════════════════════════════════════════════════════ */
async function handleCopas(req, res) {
  const db = await getDb("copa_expresso");
  const copas = db.collection("copas");

  if (req.method === "GET") {
    const data = await copas.find().sort({ createdAt: -1 }).toArray();
    return res.status(200).json(data);
  }

  if (req.method === "POST") {
    const body = req.body;

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
          status: "active", selectedTeams, players, bracket,
          createdAt: new Date(), updatedAt: new Date()
        });
        return res.status(200).json({ message: "Copa creada", id: result.insertedId.toString() });
      }
    }

    if (body.action === "archive") {
      const { champion, teams, totalGoals, matches, goleadores, edition, date } = body;
      await copas.updateOne(
        { status: "active" },
        { $set: { status: "finished", champion, teams, totalGoals, matches, goleadores, edition, date, finishedAt: new Date() } }
      );
      return res.status(200).json({ message: "Copa archivada" });
    }

    return res.status(400).json({ message: "Acción no válida" });
  }

  if (req.method === "DELETE") {
    const { id } = req.body;
    if (!id) return res.status(400).json({ message: "Falta el id" });

    let objectId;
    try { objectId = new ObjectId(id); }
    catch (_) { return res.status(400).json({ message: "Id inválido" }); }

    await copas.deleteOne({ _id: objectId });
    return res.status(200).json({ message: "Copa eliminada" });
  }

  return res.status(405).end();
}

/* ════════════════════════════════════════════════════
   HELPERS TABLA
════════════════════════════════════════════════════ */
async function actualizarTabla(tabla, local, visitante, resultado) {
  const gl = Number(resultado?.local ?? 0);
  const gv = Number(resultado?.visitante ?? 0);

  const upd = async (nombre, gf, gc, pts, g, e, p) =>
    tabla.updateOne({ equipo: nombre }, { $inc: { PJ: 1, G: g, E: e, P: p, GF: gf, GC: gc, DG: gf - gc, PTS: pts } }, { upsert: true });

  if (gl > gv) { await upd(local.nombre, gl, gv, 3, 1, 0, 0); await upd(visitante.nombre, gv, gl, 0, 0, 0, 1); }
  else if (gl < gv) { await upd(local.nombre, gl, gv, 0, 0, 0, 1); await upd(visitante.nombre, gv, gl, 3, 1, 0, 0); }
  else { await upd(local.nombre, gl, gv, 1, 0, 1, 0); await upd(visitante.nombre, gv, gl, 1, 0, 1, 0); }
}

async function revertirTabla(tabla, local, visitante, resultado) {
  if (!local || !visitante || !resultado) return;
  const gl = Number(resultado?.local ?? 0);
  const gv = Number(resultado?.visitante ?? 0);

  const rev = async (nombre, gf, gc, pts, g, e, p) =>
    tabla.updateOne({ equipo: nombre }, { $inc: { PJ: -1, G: -g, E: -e, P: -p, GF: -gf, GC: -gc, DG: -(gf - gc), PTS: -pts } });

  if (gl > gv) { await rev(local.nombre, gl, gv, 3, 1, 0, 0); await rev(visitante.nombre, gv, gl, 0, 0, 0, 1); }
  else if (gl < gv) { await rev(local.nombre, gl, gv, 0, 0, 0, 1); await rev(visitante.nombre, gv, gl, 3, 1, 0, 0); }
  else { await rev(local.nombre, gl, gv, 1, 0, 1, 0); await rev(visitante.nombre, gv, gl, 1, 0, 1, 0); }
}

async function actualizarJugadores(jugadores, eventos, mvp, torneo = "liga") {
  const TORNEO_CAMPOS = { gol: "goles", asistencia: "asistencias", amarilla: "amarillas", roja: "rojas" };
  for (const e of eventos) {
    const campo = TORNEO_CAMPOS[e.tipo];
    if (campo) {
      // Siempre sumamos al global y al específico del torneo
      const campoTorneo = `${campo}_${torneo}`;
      await jugadores.updateOne(
        { nombre: e.jugador },
        { $inc: { [campo]: 1, [campoTorneo]: 1 } }
      );
    }
  }
  if (mvp) {
    const campoMvpTorneo = `mvp_${torneo}`;
    await jugadores.updateOne({ nombre: mvp }, { $inc: { mvp: 1, [campoMvpTorneo]: 1 } });
  }
}

async function revertirJugadores(jugadores, eventos, mvp, torneo = "liga") {
  const TORNEO_CAMPOS = { gol: "goles", asistencia: "asistencias", amarilla: "amarillas", roja: "rojas" };
  for (const e of eventos) {
    const campo = TORNEO_CAMPOS[e.tipo];
    if (campo) {
      const campoTorneo = `${campo}_${torneo}`;
      await jugadores.updateOne(
        { nombre: e.jugador },
        { $inc: { [campo]: -1, [campoTorneo]: -1 } }
      );
    }
  }
  if (mvp) {
    const campoMvpTorneo = `mvp_${torneo}`;
    await jugadores.updateOne({ nombre: mvp }, { $inc: { mvp: -1, [campoMvpTorneo]: -1 } });
  }
}

/* ════════════════════════════════════════════════════
   HELPER DB
════════════════════════════════════════════════════ */
async function getDb(dbName) {
  const client = await clientPromise;
  return client.db(dbName);
}