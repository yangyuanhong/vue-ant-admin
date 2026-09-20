import type { Server as HttpServer } from "http";
import { Server } from "socket.io";
import { authenticateSocket } from "./auth.js";
import { registerSocketHandlers } from "./handlers.js";
import type { AppSocketServer } from "./types/index.js";

export function createSocketServer(httpServer: HttpServer): AppSocketServer {
  const io: AppSocketServer = new Server(httpServer, {
    cors: {
      origin: true,
      credentials: true,
    },
  });

  // Socket.IO 握手阶段复用 Express 使用的 JWT 密钥校验登录 token
  io.use(authenticateSocket);

  io.on("connection", (socket) => {
    registerSocketHandlers(io, socket);
  });

  return io;
}
