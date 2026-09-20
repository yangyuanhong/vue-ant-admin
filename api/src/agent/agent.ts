import { createAgent } from "langchain";
import { getModel } from "./model.js";
import { getCurrentTimeTool } from "./tools/get-current-time.js";
import { calculatorTool } from "./tools/calculator.js";
import { createGetCurrentUserTool } from "./tools/get-current-user.js";

const agentCache = new Map<string, ReturnType<typeof createAgent>>()

export function getAgent(userId:string) {
  const cachedAgent = agentCache.get(userId) 

  if (cachedAgent) {
    return cachedAgent
  }

  const agent = createAgent({
    model: getModel(),
    tools: [
      getCurrentTimeTool,
      calculatorTool,
      createGetCurrentUserTool(userId)
    ],

    systemPrompt: [
      "你是一个友好的中文智能助手。",
      "回答需要实时日期或时间段，必须调用 get_current_time 工具。",
      "需要进行精确基础数学计算时，调用 calculate。",
      "用户询问自己的账号资料、用户名、角色、头像、个人介绍或注册时间时，调用 get_current_user。",
      "不要猜测时间，不要自行完成精确数学计算。",
      "不得询问或猜测用户 ID，当前用户身份由服务端认证上下文提供。",
      "工具返回结果后，用自然、简洁的中文回答用户。"
    ].join("\n"),
  })

  agentCache.set(userId, agent)

  return agent
}