import type {
  ChatFileItem,
  ChatModel,
  MessageModel,
  User,
} from "@advanced-chat/components";
import { message } from "ant-design-vue";
import { type Ref } from "vue";
import { sendChatMessage } from "@/utils/socket";
import { uploadConversationFile } from "@/api/agent";
import type { UploadedChatFileDto } from "../types";

export interface SendPayload {
  content: string;
  files: ChatFileItem[];
  mentionedUsers: Array<{ id: string }>;
}

export async function sendMessage(
  payload: SendPayload,
  activeChat: Ref<ChatModel>,
  messagesText: Ref<MessageModel[]>,
  currentUser: User,
  assistantUser: User,
): Promise<void> {
  if (!activeChat.value.id) {
    message.error("会话尚未加载完成");
    return;
  }

  const content = payload.content.trim();
  if (!content && payload.files.length === 0) return;

  let uploadedFiles: UploadedChatFileDto[] = [];

  try {
    if (payload.files.length > 0) {
      message.loading({
        content: "正在上传附件...",
        key: "chat-file-upload",
        duration: 0,
      });

      uploadedFiles = await uploadMessageFiles(
        activeChat.value.id,
        payload.files,
      );

      message.success({
        content: "附件上传成功",
        key: "chat-file-upload",
      });
    }
  } catch (error) {
    message.error({
      content: error instanceof Error ? error.message : "附件上传失败",
      key: "chat-file-upload",
    });

    return;
  } finally {
    // ChatFooter 将本地 URL 的释放责任交给事件监听者
    for (const file of payload.files) {
      if (file.localUrl) {
        URL.revokeObjectURL(file.localUrl);
      }
    }
  }

  const fileIds = uploadedFiles.map(file=>file.fileId)
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
        fileIds,
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

async function uploadMessageFiles(
  conversationId: string,
  files: ChatFileItem[],
): Promise<UploadedChatFileDto[]> {
  const uploadedFiles: UploadedChatFileDto[] = [];

  for (const file of files) {
    if (!file.blob) {
      throw new Error(`无法读取文件：${file.name}`);
    }

    const response = await uploadConversationFile(
      conversationId,
      file.blob,
      file.name,
    );

    uploadedFiles.push(response.data);
  }

  return uploadedFiles;
}
