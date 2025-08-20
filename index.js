


import express from "express";
import multer from "multer";
import fs from "fs";
import cors from "cors";
import vosk from "vosk";
import say from "say";   // 👈 add this
import path from "path";

const { Model } = vosk;
const app = express();
app.use(cors());

const upload = multer({ dest: "uploads/" });

vosk.setLogLevel(0);

// Load Vosk model
const model = new Model("./model");


// 🧠 Intent → Response
const responses = {
  services: "We provide Web Development, Mobile Apps, and AI Solutions.",
  hello: "Hello! How can I help you today?",
  default: "Sorry, I didn’t get that. Can you rephrase?",
};

// Helper: figure out intent
function getIntent(text) {
  text = text.toLowerCase();
  if (text.includes("service")) return "services";
  if (text.includes("hello") || text.includes("hi")) return "hello";
  return "default";
}

// 💬 Chat route
app.post("/chat", express.json(), (req, res) => {
  const { message } = req.body;
  const intent = getIntent(message);
  const reply = responses[intent];
  res.json({ reply });
});


// 🎤 Speech → Text
app.post("/stt", upload.single("audio"), async (req, res) => {
  try {
    const buffer = fs.readFileSync(req.file.path);

    const rec = new vosk.Recognizer({ model: model, sampleRate: 16000 });
    rec.acceptWaveform(buffer);

    const result = rec.finalResult();

    rec.free();
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// 🗣️ Text → Speech
app.get("/tts/:text", (req, res) => {
  const text = decodeURIComponent(req.params.text);
  const filePath = path.join(process.cwd(), "reply.wav");

  // Export speech to wav
  say.export(text, null, 1.0, filePath, (err) => {
    if (err) return res.status(500).json({ error: err.message });

    res.setHeader("Content-Type", "audio/wav"); // 👈 ensure browser can play it
    res.sendFile(filePath);
  });
});

app.listen(5000, () => console.log("Server running on http://localhost:5000"));