import clientPromise from "../lib/mongodb.js";

export default async function handler(req, res) {
  try {
    const client = await clientPromise;
    const db = client.db("haxball");

    const users = await db.collection("users").find().toArray();

    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: "Error", error: error.message });
  }
}