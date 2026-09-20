import type {
  ChatFileItem,
  ChatModel,
  MessageModel,
  User,
} from "@advanced-chat/components";
import { message } from "ant-design-vue";
import type { Ref } from "vue";
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
  messagesText.value.push({
    id: clientMessageId,
    sender: currentUser,
    content,
    createdAt: new Date().toISOString(),
    status: "sent",
  });

  try {
    sendChatMessage(
      {
        conversationId: activeChat.value.id,
        content,
        clientMessageId,
      },
      (result) => {
        if (!result.success) {
          const failedMessage = messagesText.value.find(
            (item) => item.id === clientMessageId,
          );
          if (failedMessage) failedMessage.status = "failed";
          activeChat.value.typingUsers = [];
        }
      },
    );
  } catch {
    const pendingIndex = messagesText.value.findIndex(
      (item) => item.id === clientMessageId,
    );
    if (pendingIndex >= 0) messagesText.value[pendingIndex].status = "failed";
    activeChat.value.typingUsers = [];
  }
}
