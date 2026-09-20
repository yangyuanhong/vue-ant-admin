// 获取当前用户信息工具函数
import { tool } from "langchain"
import { z } from "zod"
import { User } from "../../models/User.js"

export function createGetCurrentUserTool(userId: string) {
  return tool(
    async () => {
      const user = await User.findById(userId)
        .select("username role avatar introduction createdAt")
        .lean();
      
      if (!user) {
        throw new Error(
          "当前登录用户不存在，请重新登录后再试。"
        )
      }

      return JSON.stringify({
        id: user._id.toString(),
        username: user.username,
        role: user.role,
        avatar: user.avatar ?? null,
        introduction: user.introduction ?? null,
        createdAt: user.createdAt,
      })
    },
    {
      name: "get_current_user",
      description: [
        "查询当前已登录用户的账号资料。",
        "当用户询问自己的用户名、角色、头像、个人介绍、账号信息或注册时间使用。",
        "该工具只查询当前JWT已认证用户，不能查询其他用户。",
        "返回当前用户的id、username、role、avatar、introduction 和 createdAt。"
      ].join(" "),

      // userId 由服务端上下文提供，模型不需要参数。
      schema: z.object({}),
    }
  )
}