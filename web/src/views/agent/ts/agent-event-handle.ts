import {
  AgentToolEndPayload,
  AgentToolStartPayload,
  type AgentDeltaPayload,
  type AgentErrorPayload,
} from "@/utils/socket";
import { ChatModel, MessageModel, User } from "@advanced-chat/components";
import { message } from "ant-design-vue";
import { type Ref } from "vue";

const toolStatusMessageIds = new Set<string>();
const toolNameMap: Record<string, string> = {
  get_current_time: "获取当前时间",
  calculate: "进行数学计算",
  get_current_user: "查询当前用户信息",
};

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
    agentMessage.content = `❌ ${payload.error}`;
  } else {
    messagesText.value.push({
      id: payload.messageId,
      sender: {
        id: "assistant",
        name: "小o",
        status: { state:"online" },
      },
      content: `❌ ${payload.error}`,
      createdAt: new Date().toISOString(),
      status: "failed"
    })
  }

  activeChat.value.typingUsers = [];
  toolStatusMessageIds.delete(payload.messageId);
  answeringMessageIds.delete(payload.messageId);
  message.error(payload.error);
};

const answeringMessageIds = new Set<string>();

export const handleAgentDelta = (
  payload: AgentDeltaPayload,
  messagesText: Ref<MessageModel[]>,
  assistantUser: User,
  activeChat: Ref<ChatModel>,
) => {
  let agentMessage = messagesText.value.find(
    (item) => item.id === payload.messageId,
  );
  if (!agentMessage) {
    agentMessage = {
      id: payload.messageId,
      sender: assistantUser,
      content: "",
      createdAt: new Date().toISOString(),
      status: "sending",
    };

    messagesText.value.push(agentMessage);
  }

  if (payload.delta) {
    // 第一个真实回答片段到达时，清除工具状态文案
    // if (toolStatusMessageIds.has(payload.messageId)) {
    //   agentMessage.content = "";
    //   toolStatusMessageIds.delete(payload.messageId)
    // }
    if (!answeringMessageIds.has(payload.messageId)) {
      answeringMessageIds.add(payload.messageId);
      agentMessage.content = "";
    }

    agentMessage.content = `${agentMessage.content ?? ""}${payload.delta}`;
  }

  if (payload.done) {
    agentMessage.status = "sent";
    activeChat.value.typingUsers = [];
    toolStatusMessageIds.delete(payload.messageId);
    answeringMessageIds.delete(payload.messageId);
  }
};

// 调用工具处理
export const handleAgentToolStart = (
  payload: AgentToolStartPayload,
  messagesText: Ref<MessageModel[]>,
  assistantUser: User,
) => {
  toolStatusMessageIds.add(payload.messageId);

  let agentMessage = messagesText.value.find(
    (item) => item.id === payload.messageId,
  );

  if (!agentMessage) {
    agentMessage = {
      id: payload.messageId,
      sender: assistantUser,
      content: "",
      createdAt: new Date().toISOString(),
      status: "sending",
    };
    messagesText.value.push(agentMessage);
  }

  const label = toolNameMap[payload.toolName] ?? payload.toolName;

  agentMessage.content = `🔧 正在${label}...`;
  agentMessage.status = "sending";
};

export const handleAgentToolEnd = (
  payload: AgentToolEndPayload,
  messagesText: Ref<MessageModel[]>,
) => {
  const label = toolNameMap[payload.toolName] || payload.toolName;

  const agentMessage = messagesText.value.find(
    (item) => item.id === payload.messageId,
  );

  if (agentMessage) {
    agentMessage.content = `✅ ${label}完成，正在整理回答…`;
  }
};
