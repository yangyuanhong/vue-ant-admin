import { Router } from "express";
import { authRequired } from "../middleware/auth.js";
import { askAgent, invokeAgent } from "../agent/index.js";
import { HumanMessage } from "langchain";

const router = Router();

interface ToolMessageView {
  type: string;
  content: unknown;
  getType: () => string;
}

router.get("/test", authRequired, async (req, res) => {
  const message = String(req.query.message || "你好，请介绍一下你自己");

  // try {
  const answer = await askAgent(message);
  res.json({
    code: 20000,
    data: {
      success: true,
      answer,
    },
    message: "调用成功",
  });
  // } catch (error) {
  // res.status(500).json({
  //   code: 5008,
  //   data: null,
  //   message: "Agent 调用失败",
  // });
  // }
});

router.get("/test-tool", authRequired, async (req, res) => {
  try {
    const question = String(
      req.query.message || "现在上海时间几点？"
    )

    const messages = await invokeAgent(
      [new HumanMessage(question),],
      req.user!.sub,)

    const lastMessage = messages.at(-1);

    res.json({
      code: 20000,
      messages: "调用成功",
      data: {
        answer: lastMessage?.content ?? "",
        messages: messages.map((item: ToolMessageView) => ({
          type: item.getType(),
          content: item.content,
        }))
      }
    })
  } catch (error) {
     console.error("Tool 测试失败：", error)

    res.status(500).json({
      code: 50000,
      message:
        error instanceof Error
          ? error.message
          : "Tool 测试失败",
      data: null,
    })
  }
})

export default router;