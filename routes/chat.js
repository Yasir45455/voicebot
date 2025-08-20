import { Router } from "express";
import { v4 as uuid } from "uuid";
import { SessionsClient } from "@google-cloud/dialogflow";
import Conversation from "../models/Conversation.js";
import dotenv from "dotenv";

dotenv.config();

const router = Router();

const projectId = process.env.GOOGLE_PROJECT_ID;

// Agar JSON key ka path use karna hai
const keyFilename = process.env.DIALOGFLOW_KEYFILE;

// ✅ Client banate waqt dono specify karo
const dfClient = new SessionsClient({
  projectId,
  keyFilename
});

router.post("/", async (req, res) => {
  try {
    const { message, sessionId: incomingSessionId, languageCode = "en" } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: "Empty message" });
    }

    const sessionId = incomingSessionId || uuid();
    const sessionPath = dfClient.projectAgentSessionPath(projectId, sessionId);

    const request = {
      session: sessionPath,
      queryInput: {
        text: {
          text: message,
          languageCode
        }
      }
    };

    const [response] = await dfClient.detectIntent(request);
    const result = response.queryResult;

    const botText = result.fulfillmentText || "(No response)";
    const intent = result.intent?.displayName || "Default";
    const confidence = result.intentDetectionConfidence ?? 0;

    // (Optional) Save conversation
    if (process.env.MONGO_URI) {
      await Conversation.findOneAndUpdate(
        { sessionId },
        {
          $push: {
            messages: [
              { role: "user", text: message },
              { role: "bot", text: botText }
            ]
          }
        },
        { upsert: true, new: true }
      );
    }

    res.json({ reply: botText, intent, confidence, sessionId });
  } catch (err) {
    console.error("Dialogflow error:", err);
    res.status(500).json({ error: "Dialogflow error" });
  }
});

export default router;