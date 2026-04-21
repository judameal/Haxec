import clientPromise from "../lib/mongodb.js";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  const client = await clientPromise;
  const db = client.db("haxball");
  const jugadores = db.collection("jugadores");

  if (req.method === "GET") {
    const data = await jugadores.find().toArray();
    return res.status(200).json(data);
  }
  
  if (req.method === "PUT") {
  let body = "";

  await new Promise(resolve => {
    req.on("data", chunk => body += chunk);
    req.on("end", resolve);
  });

  const { id, nombre, dorsal, equipo, foto } = JSON.parse(body);

  await jugadores.updateOne(
    { _id: new ObjectId(id) },
    { $set: { nombre, dorsal, equipo, foto } }
  );

  return res.status(200).json({ message: "Jugador actualizado" });
}

if (req.method === "DELETE") {
  let body = "";

  await new Promise(resolve => {
    req.on("data", chunk => body += chunk);
    req.on("end", resolve);
  });

  const { id } = JSON.parse(body);

  await jugadores.deleteOne({ _id: new ObjectId(id) });

  return res.status(200).json({ message: "Jugador eliminado" });
}

  if (req.method === "POST") {
  let body = "";

  await new Promise((resolve) => {
    req.on("data", chunk => body += chunk);
    req.on("end", resolve);
  });

  const { dorsal, nombre, equipo } = JSON.parse(body);

  if (!dorsal || !nombre) {
    return res.status(400).json({ message: "Faltan datos" });
  }

  await jugadores.insertOne({
  dorsal,
  nombre,
  equipo: equipo || "Sin equipo",

  goles: 0,
  asistencias: 0,
  amarillas: 0,
  rojas: 0,
  mvp: 0,

  foto: ""
});

  return res.status(200).json({ message: "Jugador creado" });
}
  res.status(405).end();
}