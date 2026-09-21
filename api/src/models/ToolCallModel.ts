import mongoose, { Schema} from "mongoose";
import type { ToolCallDocument } from "./types/index.js";

const toolCallSchema = new Schema<ToolCallDocument>(
  {
    conversationId: {
      type: String,
      required: true,
      index: true,
    },

    messageId: {
      type: String,
      required: true,
      index: true,
    },

    userId: {
      type: String,
      required: true,
      index: true,
    },
    toolCallId: {
      type: String,
      required: true,
    },
    toolName: {
      type: String,
      required: true,
      index: true,
    },
    input: {
      type: Schema.Types.Mixed,
      default: {},
    },
    output: {
      type: Schema.Types.Mixed,
    },
    status: {
      type: String,
      enum: ["running", "success", "failed"],
      default: "running",
      required: true,
    },
    error: {
      type: String,
    },
    startedAt: {
      type: Date,
      required: true,
    },
    finishedAt: {
      type: Date,
    },
    durationMs: {
      type: Number,
    }
  },
  {
    timestamps: true,
  }
);

toolCallSchema.index(
  {
    conversationId: 1,
    toolCallId: 1,
  },
  {
    unique: true,
  },
);

toolCallSchema.index({
  conversationId: 1,
  createdAt: 1,
});

export const ToolCallModel = mongoose.model<ToolCallDocument>(
  "ToolCall",
  toolCallSchema,
);