export interface ConversationDto {
  _id: string;
  title: string;
  ownerId: string;
  participantIds: string[];
  type: "agent" | "group";
  status: "active" | "archived";
  createdAt: string;
  updateAt: string;
}

export interface ChatMessageDto {
  _id: string
  conversationId: string
  senderId: string
  role: "user" | "assistant" | "system" | "tool"
  content: string
  clientMessageId?: string
  status: "sending" | "sent" | "failed"
  createdAt: string
  updatedAt: string
}