import { tool } from "langchain";
import { z } from "zod";

export const getCurrentTimeTool = tool(
  async ({ timeZone }) => {
    const now = new Date();
    const resolvedTimeZone = timeZone || "Asia/Shanghai";

    console.log("[tool] get_current_time", {
      timeZone,
    });

    const formattedTime = new Intl.DateTimeFormat("zh-CN", {
      timeZone: resolvedTimeZone,
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(now);

    return JSON.stringify({
      timeZone: resolvedTimeZone,
      formattedTime,
      isoTime: now.toISOString(),
    });
  },
  {
    name: "get_current_time",
    description:
      "获取指定时区的当前日期和时间。当用户询问现在几点、今天日期、当前时间或某个时区的实时日期时间时使用。返回指定时区、格式化时间和ISO时间。",
    schema: z.object({
      timeZone: z
        .string()
        .default("Asia/Shanghai")
        .describe(
          "IANA 时区名称，列如 Asia/Shanghai、Asia/Tokyo、America/New_York。用户没有指定时区时使用Asia/Shanghai。",
        ),
    }),
  },
);
