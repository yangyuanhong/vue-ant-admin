import { MessageModel, type User } from "@advanced-chat/components";
import type { ChatMessageDto } from "../types";
import type { ComputedRef } from "vue";

export function toMessageModel(
  item: ChatMessageDto,
  currentUser: ComputedRef<User>,
  assistantUser: User,
): MessageModel {
  const sender = item.role === "assistant" ? assistantUser : currentUser.value;
  return {
    id: item._id,
    sender,
    content: item.content,
    createdAt: item.createdAt,
    status: item.status,
  };
}
