import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import authRouter from "./routes/auth.js";
import transactionRouter from "./routes/transaction.js";
import agentRouter from "./routes/agent.js";
import testRouter from "./routes/test.js";
import { connectDb } from "./config/db.js";
import { createSocketServer } from "./socket/index.js";
import { logger } from "./utils/logger.js";

dotenv.config({ path: new URL("../.env", import.meta.url) });
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webDist = path.resolve(__dirname, "../../web/dist");

const app = express();
const port = process.env.PORT || 3000;
const httpServer = createServer(app);
createSocketServer(httpServer);

app.use(cors());
app.use(express.json());
app.use(express.static(webDist));

//history模式基于HTML5 History AP,URL更美观，没有#但是刷新会真实请求对应路径，所以需要后端配置fallback，把请求都返回到index.html
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api") || req.path === "/health") {
    return next();
  }

  res.sendFile(path.join(webDist, "index.html"));
});

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "quiz-api" });
});

app.use("/api/auth", authRouter);
app.use("/api/tran", transactionRouter);
app.use("/api/agent", agentRouter);
app.use("/api/test", testRouter);

await connectDb(process.env.MONGODB_URI);

httpServer.listen(port, () => {
  logger.info(
    {
      port,
      environment: process.env.NODE_ENV ?? "development",
    },
    "API 服务已启动",
  );
});
