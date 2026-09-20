import mongoose, {Schema} from "mongoose";
import type { ConversationDocument } from "./types/index.js";

const conversationSchema = new Schema<ConversationDocument>({
  title: {
    type: String,
    default: "新对话",
    trim: true,
  },
  ownerId: {
    type: String,
    required: true,
    index: true,
  },
  participantIds: {
    type: [String],
    default: [],
    index: true,
  },
  type: {
    type: String,
    enum: ["agent", "group"],
    default: "agent"
  },
  status: {
    type: String,
    enum: ["active", "archived"],
    default: "active"
  }
}, {
  timestamps: true,
})

conversationSchema.index({
  ownerId: 1,
  updatedAt: -1,
})

export const ConversationModel = mongoose.model<ConversationDocument>(
  "Conversation",
  conversationSchema
)