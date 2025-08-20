import { Router } from "express";
import textToSpeech from "@google-cloud/text-to-speech";
import fs from "fs";
import util from "util";
import dotenv from "dotenv";

dotenv.config();

const router = Router();
const ttsClient = new textToSpeech.TextToSpeechClient({
  keyFilename: process.env.DIALOGFLOW_KEYFILE,
});

router.post("/", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "No text provided" });

    const [response] = await ttsClient.synthesizeSpeech({
      input: { text },
      voice: { languageCode: "en-US", ssmlGender: "NEUTRAL" },
      audioConfig: { audioEncoding: "MP3" },
    });

    res.set("Content-Type", "audio/mpeg");
    res.send(response.audioContent);
  } catch (err) {
    console.error("TTS error:", err);
    res.status(500).json({ error: "Text-to-Speech failed" });
  }
});

export default router;
