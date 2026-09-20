import { createAgent } from "langchain";
import { getModel } from "./model.js";
import { getCurrentTimeTool } from "./tools/get-current-time.js";

let agent: ReturnType<typeof createAgent> | undefined

export function getAgent() {
  if (agent) {
    return agent
  }

  agent = createAgent({
    model: getModel(),
    tools: [
      getCurrentTimeTool,
    ],

    systemPrompt: [
      "你是一个友好的中文智能助手。",
      "回答需要实时日期或时间段，必须调用 get_current_time 工具。",
      "不要根据训练数据猜测当前日期或时间。",
      "工具返回结果后，用自然、简洁的中文回答用户。"
    ].join("\n"),
  })

  return agent
}