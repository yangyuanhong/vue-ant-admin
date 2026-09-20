import type {
  ChatFileItem,
  ChatModel,
  MessageModel,
  User,
} from "@advanced-chat/components";
import { message } from "ant-design-vue";
import { Reactive, type Ref } from "vue";
import { sendChatMessage } from "@/utils/socket";

export interface SendPayload {
  content: string;
  files: ChatFileItem[];
  mentionedUsers: Array<{ id: string }>;
}

export function sendMessage(
  payload: SendPayload,
  activeChat: Ref<ChatModel>,
  messagesText: Ref<MessageModel[]>,
  currentUser: User,
  assistantUser: User,
): void {
  if (!activeChat.value.id) {
    message.error("会话尚未加载完成");
    return;
  }

  const content = payload.content.trim();
  if (!content) return;

  const clientMessageId = crypto.randomUUID();

  activeChat.value.typingUsers = [{ id: assistantUser.id }];

  const pendingAgentMessageId = `pending-agent-${clientMessageId}`;
  messagesText.value.push({
    id: clientMessageId,
    sender: currentUser,
    content,
    createdAt: new Date().toISOString(),
    status: "sent",
  });

  messagesText.value.push({
    id: pendingAgentMessageId,
    sender: assistantUser,
    content: "💭 正在思考…",
    createdAt: new Date().toISOString(),
    status: "sending",
  });

  try {
    sendChatMessage(
      {
        conversationId: activeChat.value.id,
        content,
        clientMessageId,
      },
      (result) => {
        if (!result.success || !result.messageId) {
          const pendingMessage = messagesText.value.find(
            (item) => item.id === pendingAgentMessageId,
          );
          if (pendingMessage) {
            pendingMessage.status = "failed";
            pendingMessage.content = "回复失败";
          }
          activeChat.value.typingUsers = [];

          return;
        }

        const pendingMessage = messagesText.value.find(
          (item) => item.id === pendingAgentMessageId,
        );

        if (pendingMessage) {
          pendingMessage.id = result.messageId;
        }

      },
    );
  } catch {
    const pendingIndex = messagesText.value.findIndex(
      (item) => item.id === pendingAgentMessageId,
    );
    if (pendingIndex >= 0) messagesText.value[pendingIndex].status = "failed";
    activeChat.value.typingUsers = [];
  }
}
