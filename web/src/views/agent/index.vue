<template>
  <div class="agent-outer">
    <AdvancedChat
      :key="activeChat.id || 'loading'"
      :current-user="currentUser"
      :chats="chats"
      :chat="activeChat"
      :messages="messagesText"
      :chats-loaded="chatsLoaded"
      :messages-loaded="messagesLoaded"
      :show-chats="true"
      height="100%"
      typing-indicator-position="header"
      accept="image/*,application/pdf,.doc,.docx"
      :max-files="5"
      :max-file-size="10 * 1024 * 1024"
      @add-chat="handleAddChat"
      @open-chat="handleOpenChat"
      @send-message="sendMessage"
      @invalid-file="onInvalidFile"
    />
  </div>
</template>
<script lang="ts" setup name="Index">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from "vue";
import {
  type ChatModel,
  type MessageModel,
  type User,
  AdvancedChat,
} from "@advanced-chat/components";
import { message } from "ant-design-vue";
import { useAuthStore } from "@/stores/auth";
import {
  getSocket,
  joinChat,
  type AgentDeltaPayload,
  type AgentErrorPayload,
} from "@/utils/socket";
import {
  createConversation,
  getConversations,
  getConversationMessages,
} from "@/api/agent";
import { type ChatMessageDto, type ConversationDto } from "./types";
import { toMessageModel } from "./utils";

// 导入io流式处理函数
import { handleAgentDelta, handleAgentError } from "./ts/agent-event-handle";
import {
  sendMessage as sendAgentMessage,
  type SendPayload,
} from "./ts/send-message";

const authStore = useAuthStore();
const socket = getSocket();
const chatsLoaded = ref(false);
const messagesLoaded = ref(false);

const currentUser = computed<User>(() => ({
  id: authStore.user?.id ?? "guest",
  name: authStore.user?.username ?? "Guest",
  avatar: authStore.avatar,
  status: { state: "online" },
}));
const assistantUser: User = {
  id: "assistant",
  name: "小O",
  status: { state: "online" },
};
const activeChat = ref<ChatModel>({
  id: "",
  name: "加载中...",
  users: [currentUser.value, assistantUser],
  typingUsers: [],
});
const chats = ref<ChatModel[]>([]);
const messagesText = ref<MessageModel[]>([]);

const onInvalidFile = ({
  file,
  reason,
}: {
  file: File;
  reason: "size" | "count";
}) => {
  const messageText =
    reason === "size" ? `${file.name} 超过 10MB 限制` : "一次最多上传 5 个文件";

  message.error(messageText);
};

// const handleChatMessage = (message: ChatMessagePayload) => {
//   // 这里只处理服务端返回的机器人消息，用户消息已在发送时立即展示
//   activeChat.typingUsers = [];
//   console.log(message);
//   messages.value.push({
//     id: message.id,
//     sender: assistantUser,
//     content: message.content,
//     createdAt: message.createdAt,
//     status: "sent",
//   });
// };

const handleAgentDeltaEvent = (payload: AgentDeltaPayload) => {
  handleAgentDelta(payload, messagesText, assistantUser, activeChat);
};
const handleAgentErrorEvent = (payload: AgentErrorPayload) => {
  handleAgentError(payload, messagesText, activeChat);
};

onMounted(() => {
  socket.on("agent:delta", handleAgentDeltaEvent);
  socket.on("agent:error", handleAgentErrorEvent);

  void initializeChat();
});

onBeforeUnmount(() => {
  // 页面离开时只移除当前页面监听，连接由 socket 工具统一管理
  socket.off("agent:delta", handleAgentDeltaEvent);
  socket.off("agent:error", handleAgentErrorEvent);
});

const sendMessage = (payload: SendPayload) => {
  sendAgentMessage(
    payload,
    activeChat,
    messagesText,
    currentUser.value,
    assistantUser,
  );
};

async function handleOpenChat(chat: ChatModel) {
  if (chat.id === activeChat.value.id) {
    return;
  }

  try {
    messagesLoaded.value = false;
    const previousConversationId = activeChat.value.id;
    activeChat.value = chat;
    messagesText.value = [];

    if (previousConversationId) {
      socket.emit("chat:leave", previousConversationId);
    }

    const response = await getConversationMessages(chat.id);

    messagesText.value = response.data.map((item) =>
      toMessageModel(item, currentUser, assistantUser),
    );

    joinChat(chat.id);
  } catch (error) {
    console.error("切换会话失败", error);
    message.error("切换会话失败");
  } finally {
    messagesLoaded.value = true;
  }
}

async function handleAddChat() {
  try {
    const response = await createConversation();
    const conversation = response.data;

    const newChat: ChatModel = {
      id: conversation._id,
      name: conversation.title,
      users: [currentUser.value, assistantUser],
      typingUsers:[],
    }

    chats.value = [newChat, ...chats.value];

    activeChat.value = newChat
    messagesText.value = [];

    joinChat(newChat.id)
  } catch (error) {
    console.error("创建会话失败", error)
    message.error("创建会话失败")
  }
}

async function initializeChat() {
  chatsLoaded.value = false;
  messagesLoaded.value = false;

  try {
    const conversationResponse = await getConversations();

    let conversations = conversationResponse.data;

    if (!conversations.length) {
      const createResponse = await createConversation();
      conversations = [createResponse.data];
    }

    const conversationChats: ChatModel[] = conversations.map(
      (conversation) => ({
        id: conversation._id,
        name: conversation.title,
        users: [currentUser.value, assistantUser],
        typingUsers: [],
      }),
    );

    chats.value = conversationChats;

    const firstChat = conversationChats[0];

    activeChat.value = firstChat;

    const messageResponse = await getConversationMessages(firstChat.id);

    messagesText.value = messageResponse.data.map((item) =>
      toMessageModel(item, currentUser, assistantUser),
    );

    // 必须使用数据库中的真实会话ID
    joinChat(firstChat.id);
  } catch (error) {
    console.error("初始化会话失败：", error);
    message.error("加载会话失败");
  } finally {
    chatsLoaded.value = true;
    messagesLoaded.value = true;
  }
}
</script>
<style lang="scss" scoped>
.agent-outer {
  margin: 25px auto;
  width: 1200px;
  height: calc(100vh - 136px);
}

.typing-indicator {
  height: 28px;
  padding: 6px 12px;
  color: #64748b;
  font-size: 13px;
}

.typing-dots {
  display: inline-block;
  width: 18px;
  overflow: hidden;
  vertical-align: bottom;
  animation: typing-dots 1.2s steps(4, end) infinite;
}

@keyframes typing-dots {
  from {
    width: 0;
  }
  to {
    width: 18px;
  }
}
</style>
