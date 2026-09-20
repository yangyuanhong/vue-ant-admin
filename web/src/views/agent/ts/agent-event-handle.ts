import {
  type AgentDeltaPayload,
  type AgentErrorPayload,
} from "@/utils/socket";
import { ChatModel, MessageModel, User } from "@advanced-chat/components";
import { message } from "ant-design-vue";
import { type Ref } from "vue";

export const handleAgentError = (
  payload: AgentErrorPayload,
  messagesText: Ref<MessageModel[]>,
  activeChat: Ref<ChatModel>,
) => {
  const agentMessage = messagesText.value.find(
    (item) => item.id === payload.messageId,
  );

  if (agentMessage) {
    agentMessage.status = "failed";
  }

  activeChat.value.typingUsers = [];
  message.error(payload.error);
};


export const handleAgentDelta = (payload: AgentDeltaPayload, messagesText: Ref<MessageModel[]>, assistantUser:User, activeChat: Ref<ChatModel>,) => {
  let agentMessage = messagesText.value.find(
    item=> item.id === payload.messageId,
  )
  if (!agentMessage) {
    agentMessage = {
      id: payload.messageId,
      sender: assistantUser,
      content: "",
      createdAt: new Date().toISOString(),
      status: "sending",
    }

    messagesText.value.push(agentMessage)
  }

  if (payload.delta) {
    agentMessage.content = `${agentMessage.content??""}${payload.delta}`
  }

  if (payload.done) {
    agentMessage.status = "sent";
    activeChat.value.typingUsers = [];
  }
}