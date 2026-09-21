import {
  AIMessage,
  HumanMessage,
  SystemMessage,
} from "@langchain/core/messages";
import { getModel } from "./model.js";
import { getAgent } from "./agent.js";
import type { BaseMessage } from "@langchain/core/messages";
import { AgentStreamEvent } from "./types/index.js";

export async function invokeAgent(messages: BaseMessage[], userId: string) {
  const agent = getAgent(userId);

  const result = await agent.invoke({
    messages,
  });

  return result.messages;
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
  userId: string,
): AsyncGenerator<AgentStreamEvent> {
  const agent = getAgent(userId);

  const stream = await agent.stream(
    {
      messages,
    },
    {
      streamMode: "messages",
    },
  );

  const startedToolCallIds = new Set<string>();

  for await (const item of stream) {
    const message = Array.isArray(item) ? item[0] : item;
    const content = message.content;
    // 识别模型发出的Tool调用
    const toolCalls =
      "tool_calls" in message && Array.isArray(message.tool_calls)
        ? message.tool_calls
        : [];

    for (const call of toolCalls) {
      const toolCallId = call.id;
      const toolName = call.name;

      if (!toolCallId || !toolName || startedToolCallIds.has(toolCallId)) {
        continue;
      }

      startedToolCallIds.add(toolCallId);

      yield {
        type: "tool-start",
        toolName,
        toolCallId,
        input: call.args ?? {},
      };
    }

    // 识别Tool返回结果
    if (message.getType?.() === "tool") {
      const toolCallId =
        "tool_call_id" in message && typeof message.tool_call_id === "string"
          ? message.tool_call_id
          : "";
      const toolName =
        "name" in message && typeof message.name === "string"
          ? message.name
          : "unknown_tool";

      yield {
        type: "tool-end",
        toolCallId,
        toolName,
        result: typeof content === "string" ? content : JSON.stringify(content),
      };

      continue;
    }

    if (typeof content === "string" && content) {
      yield {
        type: "text",
        content,
      };
      continue;
    }

    if (Array.isArray(content)) {
      for (const block of content) {
        if (
          typeof block === "object" &&
          block !== null &&
          "text" in block &&
          typeof block.text === "string" &&
          block.text
        ) {
          yield {
            type: "text" as const,
            content: block.text,
          };
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
