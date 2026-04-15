import clientPromise from "../lib/mongodb.js";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  const client = await clientPromise;
  const db = client.db("haxball");
  const teams = db.collection("teams");

  if (req.method === "GET") {
    const data = await teams.find().toArray();
    return res.status(200).json(data);
  }

  if (req.method === "POST") {
    let body = "";

    await new Promise((resolve) => {
      req.on("data", chunk => body += chunk);
      req.on("end", resolve);
    });

    const { nombre, logo, local, visitante } = JSON.parse(body);

    await teams.insertOne({ nombre, logo, local, visitante });

    return res.status(200).json({ message: "Equipo creado" });
  }

  if (req.method === "DELETE") {
    let body = "";

    await new Promise((resolve) => {
      req.on("data", chunk => body += chunk);
      req.on("end", resolve);
    });

    const { id } = JSON.parse(body);

    await teams.deleteOne({ _id: new ObjectId(id) });

    return res.status(200).json({ message: "Eliminado" });
  }

  res.status(405).end();
}