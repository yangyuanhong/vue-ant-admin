import { type Document } from "mongoose"

export interface ConversationDocument extends Document {
  title: string
  ownerId: string
  participantIds: string[]
  type: "agent" | "group"
  status: "active" | "archived"
  createdAt: Date
  updatedAt: Date
}

export interface ChatMessageDocument extends Document {
  conversationId: string
  senderId: string
  role: "user" | "assistant" | "system" | "tool"
  content: string
  clientMessageId?: string
  status: "sending" | "sent" | "failed"
  createdAt: Date
  updatedAt: Date
}