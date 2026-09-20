import {
  AIMessage,
  HumanMessage,
  SystemMessage,
} from "@langchain/core/messages";
import { getModel } from "./model.js";
import { getAgent } from "./agent.js";
import type { BaseMessage } from "@langchain/core/messages";

export async function invokeAgent(messages: BaseMessage[]) {
  const agent = getAgent()

  const result = await agent.invoke({
    messages,
  })

  return result.messages
}
export async function askAgent(userInput: string): Promise<string> {
  const model = getModel();
  const response = await model.invoke([
    new SystemMessage("你是一个友好的中文智能助手，回答要清晰、简洁、准确。"),
    new HumanMessage(userInput),
  ]);

  if (typeof response.content === "string") {
    return response.content;
  }

  return response.content
    .map((item) => {
      if (typeof item === "string") {
        return item;
      }

      if ("text" in item && typeof item.text === "string") {
        return item.text;
      }

      return "";
    })
    .join("");
}

// 新链路：Socket → createAgent → Tool → ChatOpenAI
export async function* streamToolAgent(
  messages: Array<HumanMessage | AIMessage | SystemMessage>,
) {
  const agent = getAgent()

  const stream = await agent.stream({
    messages,
  }, {
    streamMode: "messages"
  })

  for await (const item of stream) {
    const message = Array.isArray(item) ? item[0] : item;

    // 工具消息包含工具的原始返回值，只向用户输出模型生成的 AI 消息。
    const messageType =
      typeof message.type === "string"
        ? message.type
        : typeof message._getType === "function"
          ? message._getType()
          : "";

    if (messageType !== "ai" && messageType !== "AIMessageChunk") {
      continue;
    }

    const content = message.content;

    if (typeof content === "string" && content) {
      yield {
        type: "text" as const,
        content,
      }
      continue
    }

    if (Array.isArray(content)) {
      for (const block of content) {
        if (typeof block === "object" &&
          block !== null && 
          "text" in block &&
          typeof block.text === "string" &&
          block.text
        ) {
          yield {
            type: "text" as const,
            content: block.text
          }
        }
      }
    }
  }
}

// 旧链路：Socket → streamAgent → ChatOpenAI
export async function* streamAgent(
  messages: Array<HumanMessage | AIMessage | SystemMessage>,
) {
  const model = getModel();

  const stream = await model.stream(messages);

  for await (const chunk of stream) {
    const content = chunk.content;

    if (typeof content === "string" && content) {
      yield content;
      continue;
    }

    if (Array.isArray(content)) {
      for (const item of content) {
        if (
          typeof item === "object" &&
          item !== null &&
          "text" in item &&
          typeof item.text === "string"
        ) {
          yield item.text;
        }
      }
    }
  }
}
