import clientPromise from "../lib/mongodb.js";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  if (req.method !== "PUT") return res.status(405).end();

  const client = await clientPromise;
  const db = client.db("haxball");
  const jugadores = db.collection("jugadores");

  let body = "";
  await new Promise(resolve => {
    req.on("data", chunk => body += chunk);
    req.on("end", resolve);
  });

  const { id, grl } = JSON.parse(body);

  if (!id || grl == null || grl < 1 || grl > 99) {
    return res.status(400).json({ message: "Datos inválidos" });
  }

  await jugadores.updateOne(
    { _id: new ObjectId(id) },
    { $set: { grl: parseInt(grl) } }
  );

  return res.status(200).json({ message: "GRL actualizado" });
}