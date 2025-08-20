import OpenAI from "openai";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const client = new MongoClient(process.env.MONGO_URI);

async function run() {
  await client.connect();
  const col = client.db("chatbot").collection("documents");

  const docs = [
    { title: "Return Policy", text: "We accept returns within 7 days." },
    { title: "Delivery Info", text: "Delivery takes 3-5 days within Pakistan." }
  ];

  const embs = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: docs.map(d => d.text)
  });

  await col.insertMany(
    docs.map((d, i) => ({ ...d, embedding: embs.data[i].embedding }))
  );

  console.log("Data ingested.");
  await client.close();
}
run();