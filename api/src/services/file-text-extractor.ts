import { readFile } from "node:fs/promises";

const TEXT_MIME_TYPES = new Set([
  "text/plain",
  "text/markdown",
]);

export async function extractTextFile(
  filePath: string,
  mimeType: string,
): Promise<string> {
  if (!TEXT_MIME_TYPES.has(mimeType)) {
    throw new Error("暂时只支持 TXT 和 Markdown 文件");
  }

  const text = await readFile(filePath, "utf-8");
  const normalizedText = text.replace(/^uFEFF/, "").trim();

  if (!normalizedText) {
    throw new Error("文件内容为空");
  }

  return normalizedText;
}