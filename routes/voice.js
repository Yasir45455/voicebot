import { Router } from "express";
import multer from "multer";
import speech from "@google-cloud/speech";
import { v4 as uuid } from "uuid";
import { SessionsClient } from "@google-cloud/dialogflow";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

const router = Router();

// File upload setup
const upload = multer({ dest: "uploads/" });

const speechClient = new speech.SpeechClient({
  keyFilename: process.env.DIALOGFLOW_KEYFILE,
});

const dfClient = new SessionsClient({
  projectId: process.env.GOOGLE_PROJECT_ID,
  keyFilename: process.env.DIALOGFLOW_KEYFILE,
});

// 🎤 Voice route
router.post("/", upload.single("audio"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No audio file uploaded" });

    // File read
    const file = fs.readFileSync(req.file.path);
    const audioBytes = file.toString("base64");

    // Speech-to-text request
    const [sttResponse] = await speechClient.recognize({
      audio: { content: audioBytes },
      config: {
        encoding: "LINEAR16", // frontend ka format hona chahiye
        sampleRateHertz: 16000,
        languageCode: "en-US",
      },
    });

    const transcript = sttResponse.results
      .map((r) => r.alternatives[0].transcript)
      .join("\n");

    if (!transcript) {
      return res.json({ error: "No speech recognized" });
    }

    // 🎯 Dialogflow request
    const sessionId = uuid();
    const sessionPath = dfClient.projectAgentSessionPath(process.env.GOOGLE_PROJECT_ID, sessionId);

    const request = {
      session: sessionPath,
      queryInput: {
        text: {
          text: transcript,
          languageCode: "en",
        },
      },
    };

    const [dfResponse] = await dfClient.detectIntent(request);
    const result = dfResponse.queryResult;
    const botText = result.fulfillmentText || "(No response)";

    res.json({
      userSpeech: transcript,
      botReply: botText,
    });
  } catch (err) {
    console.error("Voice error:", err);
    res.status(500).json({ error: "Voice processing failed" });
  }
});

export default router;
