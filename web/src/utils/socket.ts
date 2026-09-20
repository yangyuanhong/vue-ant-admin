import { io, type Socket } from "socket.io-client";
import { getToken } from "@/utils/auth";

export interface AgentDeltaPayload {
  conversationId: string;
  messageId: string;
  delta: string;
  done: boolean;
}

export interface AgentErrorPayload {
  conversationId: string
  messageId: string
  error: string
}

export interface AgentToolStartPayload {
  conversationId: string
  messageId: string
  toolName: string
}

export interface AgentToolEndPayload {
  conversationId: string
  messageId: string
  toolName: string
  result?: string
}

export interface ChatMessagePayload {
  id: string;
  clientMessageId: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string;
}

export interface SendMessagePayload {
  conversationId: string;
  content: string;
  clientMessageId: string;
}

export interface SendMessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

interface ServerToClientEvents {
  "agent:delta": (payload: AgentDeltaPayload) => void
  "agent:error": (payload: AgentErrorPayload) => void
  "chat:message": (message: ChatMessagePayload) => void
  "agent:tool-start": (payload: AgentToolStartPayload) => void
  "agent:tool-end": (payload: AgentToolEndPayload) => void
}

interface ClientToServerEvents {
  "chat:join": (conversationId: string) => void;
  "chat:leave": (conversationId: string) => void;
  "chat:send": (
    payload: SendMessagePayload,
    callback: (result: SendMessageResult) => void,
  ) => void;
}

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: AppSocket | null = null;

/** 获取全局 Socket.IO 连接；首次调用时携带当前登录用户的 JWT。 */
export function getSocket(): AppSocket {
  if (!socket) {
    socket = io(import.meta.env.VITE_BASE_API, {
      autoConnect: false,
      transports: ["websocket"],
      reconnection: true,
    });
  }

  socket.auth = { token: getToken() };
  if (!socket.connected) socket.connect();
  return socket;
}

/** 主动关闭连接，通常在退出登录时调用。 */
export function disconnectSocket(): void {
  socket?.disconnect();
}

export function joinChat(conversationId: string): void {
  getSocket().emit("chat:join", conversationId);
}

export function sendChatMessage(
  payload: SendMessagePayload,
  callback: (result: SendMessageResult) => void,
): void {
  getSocket().emit("chat:send", payload, callback);
}
