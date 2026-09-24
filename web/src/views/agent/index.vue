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
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
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
  type AgentToolStartPayload,
  type AgentToolEndPayload,
  type AgentDeltaPayload,
  type AgentErrorPayload,
} from "@/utils/socket";
import { createChatListHandlers } from "./ts/chat-list";

// 导入io流式处理函数
import { handleAgentDelta, handleAgentError, handleAgentToolEnd, handleAgentToolStart } from './ts/agent-event-handle';
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

const { handleOpenChat, handleAddChat, initializeChat } =
  createChatListHandlers({
    socket,
    currentUser,
    assistantUser,
    chats,
    activeChat,
    messagesText,
    chatsLoaded,
    messagesLoaded,
  });

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

const handleAgentToolStartEvent = (payload: AgentToolStartPayload) => {
  handleAgentToolStart(payload, messagesText, assistantUser);
};

const handleAgentToolEndEvent = (payload: AgentToolEndPayload) => {
  handleAgentToolEnd(payload, messagesText)
}

onMounted(() => {
  socket.on("agent:delta", handleAgentDeltaEvent);
  socket.on("agent:error", handleAgentErrorEvent);
  socket.on("agent:tool-start", handleAgentToolStartEvent);
  socket.on("agent:tool-end", handleAgentToolEndEvent);

  void initializeChat();
});

onBeforeUnmount(() => {
  // 页面离开时只移除当前页面监听，连接由 socket 工具统一管理
  socket.off("agent:delta", handleAgentDeltaEvent);
  socket.off("agent:error", handleAgentErrorEvent);
  socket.off("agent:tool-start", handleAgentToolStartEvent);
  socket.off("agent:tool-end", handleAgentToolEndEvent);
});

const sendMessage = (payload: SendPayload) => {
  void sendAgentMessage(
    payload,
    activeChat,
    messagesText,
    currentUser.value,
    assistantUser,
  );
};
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
