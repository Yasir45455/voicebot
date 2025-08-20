import express from "express";
import multer from "multer";
import cors from "cors";
import vosk from "vosk";
import say from "say";   // 👈 TTS
import path from "path";

const { Model } = vosk;
const app = express();
app.use(
  cors({
    origin: ["https://voicebot.oxmite.com"], 
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
  })
);
// 👉 FIX: use memoryStorage instead of writing to /uploads
const upload = multer({ storage: multer.memoryStorage() });

vosk.setLogLevel(0);

// Load Vosk model (must be bundled/deployed properly, not downloaded at runtime)
const model = new Model("./model");

// 🧠 Intent → Response
const responses = {
  services: "We provide Web Development, Mobile Apps, and AI Solutions.",
  hello: "Hello! How can I help you today?",
  default: "Sorry, I didn’t get that. Can you rephrase?",
};

function getIntent(text) {
  text = text.toLowerCase();
  if (text.includes("service")) return "services";
  if (text.includes("hello") || text.includes("hi")) return "hello";
  return "default";
}

// 💬 Chat
app.post("/chat", express.json(), (req, res) => {
  const { message } = req.body;
  const intent = getIntent(message);
  res.json({ reply: responses[intent] });
});

// 🎤 Speech → Text
app.post("/stt", upload.single("audio"), async (req, res) => {
  try {
    const buffer = req.file.buffer; // 👈 file now in memory

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

  say.export(text, null, 1.0, filePath, (err) => {
    if (err) return res.status(500).json({ error: err.message });

    res.setHeader("Content-Type", "audio/wav");
    res.sendFile(filePath);
  });
});

app.get("/", (req, res) => res.send("Hello From Voice Bot Server!"));
app.get("/favicon.ico", (req, res) => res.status(204).end());

app.listen(5000, () => console.log("Server running on http://localhost:5000"));
