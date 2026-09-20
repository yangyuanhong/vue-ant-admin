import { ChatOpenAI } from "@langchain/openai";

let model: ChatOpenAI | undefined;

// 封装model，抽离配置
export function getModel(): ChatOpenAI {
  if (model) {
    return model
  }

  const apiKey = process.env.OPENAI_API_KEY
  const baseURL = process.env.OPENAI_BASE_URL
  const modelName = process.env.OPENAI_MODEL || "gpt-5.6-sol"

  if (!apiKey) {
    throw new Error("系统环境变量 OPENAI_API_KEY 未配置")
  }

  if (!baseURL) {
    throw new Error("系统环境变量 OPENAI_BASE_URL 未配置")
  }

  model = new ChatOpenAI({
    model: modelName,
    temperature: 0.7,
    timeout: 30_000,
    maxRetries: 1,
    configuration: {
      baseURL,
    }
  })

  return model
}