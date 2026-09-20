import { Router } from "express";
import { authRequired } from "../middleware/auth.js";
import { isEmptyObject } from "../utils/index.js";
import { ConversationModel } from "../models/ConversationModel.js";
import { ChatMessageModel } from "../models/ChatMessageModel.js";

const router = Router();

// 创建会话路由
router.post("/conversations", authRequired, async (req, res) => {
   const body = !isEmptyObject(req.body) ? req.body : req.query;
  try {
    const userId = req.user!.sub;
      const data = await ConversationModel.create({
        title: body.title || "新对话",
        ownerId: userId,
        participantIds: [userId],
        type: "agent",
        status:"active"
      });
      res.json({
        code: 20000,
        message: "创建成功",
        data: data,
      });
    } catch (error) {
      res.status(500).json({
        code: 20002,
        message: "创建失败",
        data: null,
      });
    }
})

router.get("/conversations", authRequired, async (req, res) => {
  try {
    const userId = req.user!.sub;

    const conversations = await ConversationModel.find({
      participantIds: userId,
      status: "active"
    }).sort({ updatedAt: -1 }).lean();

    res.json({
      code: 20000,
      message: "查询成功",
      data: conversations,
    })
  } catch (error) {
    console.error("查询会话失败：", error)

    res.status(500).json({
      code: 20002,
      message: "查询会话失败",
      data: []
    })
  }
});

router.get(
  "/conversations/:conversationId/messages",
  authRequired,
  async (req, res) => {
    try {
      const userId = req.user!.sub
      const conversationId = req.params.conversationId

      // 先校验会话归属
      const conversation = await ConversationModel.findOne({
        _id: conversationId,
        participantIds: userId,
        status: "active",
      }).lean()

      if (!conversation) {
        res.status(404).json({
          code: 20004,
          message: "会话不存在或无权访问",
          data: [],
        })
        return
      }

      const messages = await ChatMessageModel.find({
        conversationId,
        status: "sent",
      })
        .sort({ createdAt: 1 })
        .limit(100)
        .lean()

      res.json({
        code: 20000,
        message: "查询成功",
        data: messages,
      })
    } catch (error) {
      console.error("查询历史消息失败：", error)

      res.status(500).json({
        code: 20002,
        message: "查询历史消息失败",
        data: [],
      })
    }
  },
)

export default router;
