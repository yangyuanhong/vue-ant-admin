import type { Server, Socket } from "socket.io";

export interface SocketUser {
  sub: string;
  username: string;
  role: string;
}

export interface AgentDeltaPayload {
  conversationId: string;
  messageId: string;
  delta: string;
  done: boolean;
}

export interface AgentErrorPayload {
  conversationId: string;
  messageId: string;
  error: string;
}

export interface SendMessagePayload {
  conversationId: string;
  content: string;
  clientMessageId?: string | null;
}

export interface SendMessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface ChatMessagePayload {
  id: string;
  clientMessageId: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string;
}

export interface ServerToClientEvents {
  "chat:message": (message: ChatMessagePayload) => void;
  "agent:delta": (payload: AgentDeltaPayload) => void;
  "agent:error": (payload: AgentErrorPayload) => void;
}

export interface ClientToServerEvents {
  "chat:join": (conversationId: string) => void;
  "chat:leave": (conversationId: string) => void;
  "chat:send": (
    payload: SendMessagePayload,
    callback: (result: SendMessageResult) => void,
  ) => void;
}

export interface InterServerEvents {}

export interface SocketData {
  user: SocketUser;
}

export type AppSocketServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

export type AppSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;
