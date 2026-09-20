import api from "@/utils/axios"
import { ApiResponse } from "@/utils/types"
import { ChatMessageDto, ConversationDto } from "@/views/agent/types"

export function getConversations():Promise<ApiResponse<ConversationDto[]>> {
  return api.get("/agent/conversations")
}

export function getConversationMessages(conversationId: string):Promise<ApiResponse<ChatMessageDto[]>> {
  return api.get(`/agent/conversations/${conversationId}/messages`)
}

export function createConversation(title = "新对话"):Promise<ApiResponse<ConversationDto>> {
  return api.post("/agent/conversations", {
    title,
  })
}