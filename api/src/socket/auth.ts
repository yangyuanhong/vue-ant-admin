import jwt from "jsonwebtoken";
import type { AppSocket } from "./types/index.js";

const jwtSecret = () => process.env.JWT_SECRET || "development-secret";

export function authenticateSocket(
  socket: AppSocket,
  next: (error?: Error) => void,
): void {
  const token = socket.handshake.auth?.token;

  if (typeof token !== "string" || !token) {
    next(new Error("Unauthorized"));
    return;
  }

  try {
    socket.data.user = jwt.verify(token, jwtSecret()) as typeof socket.data.user;
    next();
  } catch {
    next(new Error("Token invalid or expired"));
  }
}
