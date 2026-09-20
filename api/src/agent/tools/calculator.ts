import { tool } from "langchain";
import { z } from "zod";

export const calculatorTool = tool(
  async ({ a, b, operation }) => {
    let result: number
    
    switch (operation) {
      case "add":
        result = a + b
        break;
      case "subtract":
        result = a - b
        break
      case "multiply":
        result = a * b
        break
      case "divide":
        if (b === 0) {
          throw new Error("除数不能为0")
        }

        result = a / b;
        break
      default:
        throw new Error(`不支持的计算操作：${operation}`)
    }

    return JSON.stringify({
      a,
      b,
      operation,
      result
    })
  }, 
  {
    name: "calculate",
    description: "执行两个数字之间的精确基础数学计算。当用户要求进行加法、减法、乘法或除法时使用。不要依靠语言模型自行计算。",

    schema: z.object({
      a: z.number().describe("第一个参与计算的数字"),
      b: z.number().describe("第二个参与计算的数字"),
      operation: z.enum([
        "add",
        "subtract",
        "multiply",
        "divide"
      ]).describe(
        "计算类型：add 加法、subtract 减法、multiply 乘法、divide 除法",
      )
    })
  }
)