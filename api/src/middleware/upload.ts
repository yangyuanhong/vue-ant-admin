import multer from "multer";
import path from "node:path";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

/**
 * 文件最终保存到 api/uploads 目录。
 *
 * import.meta.url 表示当前 upload.ts 文件的位置。先基于它定位到
 * ../../uploads/，再用 fileURLToPath 转成操作系统可以识别的文件路径。
 */
const uploadDirectory = fileURLToPath(
  new URL("../../uploads/", import.meta.url),
);

// 服务启动时确保上传目录存在；recursive: true 表示父目录不存在时也一并创建。
// 如果目录已经存在，mkdirSync 不会报错。
mkdirSync(uploadDirectory, {
  recursive: true,
});

// 允许上传的 MIME 类型。MIME 类型来自上传请求中的文件信息。
const allowedMimeTypes = new Set([
  // 图片
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",

 "text/plain",
  "text/markdown",
  "text/csv",

  "application/pdf",

  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",

  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

  "application/rtf",
  "application/epub+zip",

  "application/vnd.oasis.opendocument.text",
  "application/vnd.oasis.opendocument.spreadsheet",
  "application/vnd.oasis.opendocument.presentation",
]);

// 允许上传的文件扩展名，用于和 MIME 类型一起校验。
// 两项都通过，可以降低只修改后缀或伪造 MIME 类型绕过检查的风险。
const allowedExtensions = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",

  ".doc",
  ".docx",
  ".docm",

  ".ppt",
  ".pps",
  ".pot",
  ".pptx",
  ".pptm",
  ".ppsx",
  ".ppsm",

  ".xls",
  ".xlsx",
  ".xlsm",
  ".xlsb",

  ".odt",
  ".ods",
  ".odp",
  ".rtf",
  ".epub",
  ".csv",

  ".pdf",
  ".txt",
  ".md",
]);

/**
 * 配置 multer 的磁盘存储方式：
 * 1. destination 决定文件保存到哪里；
 * 2. filename 决定文件保存时使用什么名字。
 */
const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    // callback 的第一个参数是错误；传 null 表示没有错误。
    callback(null, uploadDirectory);
  },
  filename: (_req, file, callback) => {
    // 保留原文件的扩展名，并统一转成小写。
    const extension = path.extname(file.originalname).toLowerCase();

    // 使用 UUID 生成唯一文件名，避免重名覆盖，也不直接暴露用户的原始文件名。
    const storedName = `${randomUUID()}${extension}`;

    callback(null, storedName);
  },
});

/**
 * 在文件写入磁盘前检查类型。
 * 这里同时检查 MIME 类型和扩展名，任意一项不在白名单中都会拒绝上传。
 */
const fileFilter: multer.Options["fileFilter"] = (_req, file, callback) => {
  file.originalname = decodeOriginalFileName(file.originalname);

  const extension = path.extname(file.originalname).toLowerCase();

  const mimeTypeAllowed = allowedMimeTypes.has(file.mimetype);

  const extensionAllowed = allowedExtensions.has(extension);

  if (!mimeTypeAllowed || !extensionAllowed) {
    callback(new Error(`不支持的文件类型：${file.originalname}`));

    return;
  }

  // callback(null, true) 表示校验通过，允许 multer 保存这个文件。
  callback(null, true);
};

/**
 * 单文件上传中间件，可直接放到 Express 路由的处理函数之前。
 *
 * 示例：router.post("/upload", uploadSingleFile, controller)
 * 上传请求必须使用 multipart/form-data，并将文件字段命名为 "file"。
 * 上传成功后，multer 会把文件信息放到 req.file 中。
 */
export const uploadSingleFile = multer({
  storage,
  fileFilter,

  limits: {
    // 单个文件最大 10 MB。
    fileSize: 10 * 1024 * 1024,
    // 一次请求最多接收 1 个文件。
    files: 1,
  },
}).single("file");

function decodeOriginalFileName(fileName: string): string {
  // 如果已经包含正常的中文字符，不再重复转换
  if ([...fileName].some((char) => char.charCodeAt(0) > 255)) {
    return fileName;
  }

  try {
    return Buffer.from(fileName, "latin1").toString("utf-8");
  } catch (error) {
    return fileName;
  }
}

// 导出目录路径，供后续读取、解析或删除上传文件的代码复用。
export { uploadDirectory };
