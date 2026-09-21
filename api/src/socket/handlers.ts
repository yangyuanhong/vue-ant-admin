import type {
  AppSocket,
  AppSocketServer,
  SendMessagePayload,
  SendMessageResult,
} from "./types/index.js";
import { streamAgent, streamToolAgent } from "../agent/index.js";
import { ConversationModel } from "../models/ConversationModel.js";
import { ChatMessageModel } from "../models/ChatMessageModel.js";
import { AIMessage, HumanMessage, SystemMessage } from "langchain";
import { ToolCallModel } from "../models/ToolCallModel.js";
import { logger } from "../utils/logger.js";

const systemMessage = new SystemMessage(
  "你是一个友好的中文智能助手，回答要清晰、简洁、准确。",
);

function parseToolResult(result: string): unknown {
  try {
    return JSON.parse(result);
  } catch {
    return result;
  }
}

function emitAgentError(
  io: AppSocketServer,
  conversationId: string,
  messageId: string,
  error: unknown,
): void {
  io.to(conversationId).emit("agent:error", {
    conversationId,
    messageId,
    error: error instanceof Error ? error.message : "Agent 回复失败",
  });
}

async function handleChatSend(
  io: AppSocketServer,
  payload: SendMessagePayload,
  callback: (result: SendMessageResult) => void,
  socket: AppSocket,
): Promise<void> {
  const content = payload.content.trim();
  const userId = socket.data.user.sub;

  if (!payload.conversationId || !content) {
    callback({
      success: false,
      error: "conversationId 和 content 不能为空",
    });
    return;
  }

  const messageId = crypto.randomUUID();

  try {
    // 1. 查询并校验当前用户是否属于这个会话
    const conversation = await ConversationModel.findOne({
      _id: payload.conversationId,
      participantIds: userId,
      status: "active",
    });

    if (!conversation) {
      callback({
        success: false,
        error: "会话不存在或无权访问",
      });
      return;
    }

    // 2、保存用户消息
    const userMessage = {
      conversationId: payload.conversationId,
      senderId: userId,
      role: "user",
      content,
      status: "sent",
      ...(payload.clientMessageId?.trim()
        ? { clientMessageId: payload.clientMessageId.trim() }
        : {}),
    };

    await ChatMessageModel.create(userMessage);

    // 3、查询最近20条历史
    const historyRecords = await ChatMessageModel.find({
      conversationId: payload.conversationId,
      status: "sent",
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    historyRecords.reverse();

    // 4、转成LangChain消息
    const history = historyRecords
      .filter((item) => item.role === "user" || item.role === "assistant")
      .map((item) => {
        if (item.role === "user") {
          return new HumanMessage(item.content);
        }

        return new AIMessage(item.content);
      });

    let fullAnswer = "";

    // 5. 告诉前端服务端已接收
    callback({
      success: true,
      messageId,
    });

    // 6、流式调用Agent
    // for await (const delta of streamAgent([systemMessage, ...history])) {
    //   fullAnswer += delta;

    //   io.to(payload.conversationId).emit("agent:delta", {
    //     conversationId: payload.conversationId,
    //     messageId,
    //     delta,
    //     done: false,
    //   });
    // }
    // 进入循环之前保存 Tool 开始时间
    const toolStartedAtMap = new Map<string, Date>();

    // 使用带工具的agent流式输出
    for await (
      const event of streamToolAgent([...history], userId)
    ) {
      if (event.type === "tool-start") {
        const startedAt = new Date();
        toolStartedAtMap.set(event.toolCallId, startedAt);
        //使用 findOneAndUpdate + upsert，可以防止流式消息重复产生 Tool Start 时插入多条记录
        await ToolCallModel.findOneAndUpdate({
          conversationId: payload.conversationId,
          toolCallId: event.toolCallId,
        }, {
          $setOnInsert: {
            conversationId: payload.conversationId,
            messageId,
            userId,
            toolCallId: event.toolCallId,
            toolName: event.toolName,
            input: event.input,
            status: "running",
            startedAt,
          },
        }, {
          upsert: true,
          new: true,
        });

        logger.info({
          conversationId: payload.conversationId,
          messageId,
          userId,
          toolCallId: event.toolCallId,
          toolName: event.toolName
        }, "Tool 开始执行",);

        io.to(payload.conversationId).emit("agent:tool-start", {
          conversationId: payload.conversationId,
          messageId,
          toolName: event.toolName,
        })

        continue
      }

      if (event.type === "tool-end") {
        const finishedAt = new Date();
        const startedAt = toolStartedAtMap.get(event.toolCallId);

        await ToolCallModel.findOneAndUpdate({
          conversationId: payload.conversationId,
          toolCallId: event.toolCallId,
        }, {
          $set: {
            output: parseToolResult(event.result || ""),
            status: "success",
            finishedAt,
            durationMs: startedAt ? finishedAt.getTime() - startedAt.getTime() : undefined,
          },
        },);

        logger.info({
          conversationId: payload.conversationId,
          messageId,
          userId,
          toolCallId: event.toolCallId,
          toolName: event.toolName,
          durationMs: startedAt ? finishedAt.getTime() - startedAt.getTime() : undefined,
        }, "Tool 执行完成");
        io.to(payload.conversationId).emit("agent:tool-end", {
          conversationId: payload.conversationId,
          messageId,
          toolName: event.toolName,
          result: event.result,
        })

        continue
      }

      fullAnswer += event.content;

      io.to(payload.conversationId).emit("agent:delta", {
        conversationId: payload.conversationId,
        messageId,
        delta: event.content,
        done: false,
      })
    }

    // 7、Agent 生成完成后保存完整回复
    await ChatMessageModel.create({
      conversationId: payload.conversationId,
      senderId: "assistant",
      role: "assistant",
      content: fullAnswer,
      status: "sent",
    });

    io.to(payload.conversationId).emit("agent:delta", {
      conversationId: payload.conversationId,
      messageId,
      delta: "",
      done: true,
    });
  } catch (error) {
    logger.error({
      err: error,
      conversationId: payload.conversationId,
      messageId,
      userId,
    }, "Agent 调用失败");
    const errorMessage = error instanceof Error ? error.message : "Agent 回复失败";
    try {
      await ToolCallModel.updateMany(
      {
        conversationId: payload.conversationId,
        messageId,
        status: "running"
      },
      {
        $set: {
          status: "failed",
          error: errorMessage,
          finishedAt: new Date(),
        }
      }
    )
    } catch (persistError) {
      logger.error({
        err: persistError,
        conversationId: payload.conversationId,
        messageId,
      }, "更新 Tool 失败状态失败")
    }
    
    callback({
      success: false,
      error: error instanceof Error ? error.message : "发送失败",
    });

    emitAgentError(io, payload.conversationId, messageId, error);
  }
}

export function registerSocketHandlers(
  io: AppSocketServer,
  socket: AppSocket,
): void {
  socket.on("chat:join", (conversationId) => {
    socket.join(conversationId);
  });

  socket.on("chat:send", (payload, callback) => {
    void handleChatSend(io, payload, callback, socket);
  });

  socket.on("chat:leave", (conversationId) => {
  socket.leave(conversationId)
})
}
