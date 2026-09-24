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

export interface ToolCallDocument extends Document {
  conversationId: string;
  messageId: string;
  userId: string;

  toolCallId: string;
  toolName: string;

  input: unknown;
  output?: unknown;

  status: "running" | "success" | "failed";
  error?: string;

  startedAt: Date;
  finishedAt?: Date;
  durationMs?: number;

  createdAt: Date;
  updatedAt: Date;
}

export interface ChatFileDocument extends Document {
  ownerId: string;
  conversationId: string;

  originalName: string;
  storedName: string;
  mimeType: string;
  size: number;
  path: string;
  extractedMarkdown?: string;

  status: "uploaded" | "processing" | "ready" | "failed";
  error?: string;

  createdAt: Date;
  updatedAt: Date;
}

export interface ChatMessageDocument extends Document {
  conversationId: string;
  senderId: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  clientMessageId?: string;

  fileIds: string[];

  status: "sending" | "sent" | "failed";
  createdAt: Date;
  updatedAt: Date;
}