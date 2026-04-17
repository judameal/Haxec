import clientPromise from "../lib/mongodb.js";

export default async function handler(req, res) {
  const client = await clientPromise;
  const db = client.db("haxball");
  const tabla = db.collection("tabla");

  if (req.method === "GET") {
    const data = await tabla.find().toArray();
    return res.json(data);
  }

  res.status(405).end();
}