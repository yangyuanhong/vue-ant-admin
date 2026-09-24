import mongoose, { Schema } from "mongoose";
import type { ChatFileDocument } from "./types/index.js";

const chatFileSchema = new Schema<ChatFileDocument>(
  {
    ownerId: {
      type: String,
      required: true,
      index: true,
    },
    conversationId: {
      type: String,
      required: true,
      index: true,
    },
    originalName: {
      type: String,
      required: true,
      trim: true,
    },
    storedName: {
      type: String,
      required: true,
      unique: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
      min: 0,
    },
    path: {
      type: String,
      required: true,
    },
    extractedMarkdown: {
      type: String,
    },
    status: {
      type: String,
      enum: [
        "uploaded",
        "processing",
        "ready",
        "failed",
      ],
      default: "uploaded",
      required: true,
      index: true,
    },

    error: {
      type: String,
    }
  },
  {
    timestamps: true,
  },
);

chatFileSchema.index({
  conversationId: 1,
  createdAt: -1,
});

chatFileSchema.index({
  ownerId: 1,
  createdAt: -1,
});

export const ChatFileModel = mongoose.model<ChatFileDocument>(
  "ChatFile",
  chatFileSchema
);