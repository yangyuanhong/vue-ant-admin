import { Format, toMarkdown, toMarkdownBytes } from "@firecrawl/anydoc";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { ParsedDocument } from "./types/index.js";

function getErrorCode(error: unknown): string | undefined {
  if (typeof error === "object" && error !== null && "code" in error) {
    return String(error.code);
  }

  return undefined;
}

export async function parseDocument(filePath: string):Promise<ParsedDocument> {
  try {
    const extension = path.extname(filePath).toLowerCase();

    let markdown: string;

    if (extension === ".md" || extension === ".markdown") {
      // Markdown 本身就是目标格式，直接读取
      markdown = await readFile(filePath, "utf8");
    } else if (extension === ".txt") {
      // 纯文本也可以直接作为 Markdown 内容使用
      markdown = await readFile(filePath, "utf8");
    } else if (extension === ".csv") {
      const bytes = await readFile(filePath);

      markdown = await toMarkdownBytes(
        bytes,
        Format.csv,
      );
    } else {
      markdown = await toMarkdown(filePath);
    }

    const normalizedMarkdown = markdown.replace(/^\uFEFF/, "").trim();

    if (!normalizedMarkdown) {
      throw new Error("文档没有可提取的正文");
    }

    return {
      markdown: normalizedMarkdown,
      format: extension.slice(1),
    };
  } catch (error) {
    const code = getErrorCode(error);

    switch (code) {
      case "needsOcr":
        throw new Error(
          "这是扫描版或图片型 PDF，需要 OCR 才能解析",
        );
      case "encrypted":
        throw new Error(
          "文件已加密或受密保护，无法解析",
        )
      case "unsupported":
        throw new Error(
          "暂不支持该文件格式",
        );

      case "malformed":
        throw new Error(
          "文件结构损坏，无法解析",
        );

      case "resourceLimit":
        throw new Error(
          "文件内容超过解析安全限制",
        );
      default:
        throw error;
    }
  }
}