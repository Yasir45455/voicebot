import mongoose from "mongoose";

const MsgSchema = new mongoose.Schema({
  role: { type: String, enum: ["user", "bot"], required: true },
  text: { type: String, required: true },
  ts: { type: Date, default: Date.now }
});

const ConversationSchema = new mongoose.Schema({
  sessionId: { type: String, index: true },
  messages: [MsgSchema]
}, { timestamps: true });

export default mongoose.model("Conversation", ConversationSchema);
