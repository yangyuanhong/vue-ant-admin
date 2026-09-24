import mongoose, { Schema } from "mongoose";
import type { ChatMessageDocument } from "./types/index.js";
// 历史消息模型设计
const chatMessageSchema = new Schema<ChatMessageDocument>(
  {
    conversationId: {
      type: String,
      required: true,
      index: true,
    },
    senderId: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["user", "assistant", "system", "tool"],
      required: true,
    },
    content: {
      type: String,
      default: "",
    },
    fileIds: {
      type: [String],
      default: [],
    },
    clientMessageId: {
      type: String,
      index: true,
    },
    status: {
      type: String,
      enum: ["sending", "sent", "failed"],
      default: "sent",
    },
  },
  {
    timestamps: true,
  },
)

chatMessageSchema.index({
  conversationId: 1,
  createdAt: 1,
})

chatMessageSchema.index(
  {
    conversationId: 1,
    clientMessageId: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      clientMessageId: { $type: "string" },
    },
  },
)

export const ChatMessageModel = mongoose.model<ChatMessageDocument>(
  "ChatMessage",
  chatMessageSchema,
)