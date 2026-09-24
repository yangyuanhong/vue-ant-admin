import api from "@/utils/axios"
import { ApiResponse } from "@/utils/types"
import { ChatMessageDto, ConversationDto, UploadedChatFileDto, } from "@/views/agent/types"

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

export function getConversationToolCalls(
  conversationId:string
) {
  return api.get(`/agent/conversations/${conversationId}/tool-calls`);
}

export function uploadConversationFile(
  conversationId: string,
  file: Blob,
  fileName: string,
):Promise<ApiResponse<UploadedChatFileDto>> {
  const formData = new FormData();

  formData.append("file", file, fileName);

  return api.post(`/agent/conversations/${conversationId}/files`, formData, {
    // 上传文件不能继续使用Axios 默认的5秒超时
    timeout: 60_000,
  });
}
