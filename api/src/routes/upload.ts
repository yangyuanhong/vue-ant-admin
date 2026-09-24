import multer from "multer";
import path from "node:path";
import { unlink } from "node:fs/promises";
import { Router, type Request, type Response } from "express";

import { ChatFileModel } from "../models/ChatFileModel.js";
import { uploadSingleFile } from "../middleware/upload.js";
import { logger } from "../utils/logger.js";
import { authRequired } from "../middleware/auth.js";
import { ConversationModel } from "../models/ConversationModel.js";
import { parseDocument } from "../services/document-parser.js";

const router = Router();

function runSingleFileUpload(req: Request, res: Response): Promise<void> {
  return new Promise((resolve, reject) => {
    uploadSingleFile(req, res, (error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

async function removeUploadedFile(filePath: string | undefined): Promise<void> {
  if (!filePath) return;

  try {
    await unlink(filePath);
  } catch (error) {
    logger.warn(
      {
        err: error,
        filePath,
      },
      "删除上传残留文件失败",
    );
  }
}

router.post(
  "/conversations/:conversationId/files",
  authRequired,
  async (req, res) => {
    const userId = req.user!.sub;
    const { conversationId } = req.params;

    try {
      // 必须先验证权限，再允许文件写入磁盘
      const conversation = await ConversationModel.findOne({
        _id: conversationId,
        participantIds: userId,
        status: "active",
      }).lean();

      if (!conversation) {
        res.status(404).json({
          code: 40400,
          message: "会话不存在或无权访问",
          data: null,
        });

        return;
      }

      // 校验通过后，才让Multer接收文件
      await runSingleFileUpload(req, res);

      if (!req.file) {
        res.status(400).json({
          code: 40000,
          message: "请选择要上传的文件",
          data: null,
        });
        return;
      }

      let extractedMarkdown: string | undefined;
      let status: "uploaded" | "processing" | "ready" | "failed" = "processing";
      const file = req.file;

      console.log({
        name: file.originalname,
        mimeType: file.mimetype,
      });

      try {
        const parsed = await parseDocument(file.path);

        extractedMarkdown = parsed.markdown;
        status = "ready";

        console.log(extractedMarkdown, "extractedMarkdown");
      } catch (error) {
        status = "failed";

        const errorMessage =
          error instanceof Error ? error.message : "文档解析失败";

        logger.error(
          {
            err: error,
            originalName: file.originalname,
            mimeType: file.mimetype,
          },
          "文档解析失败",
        );
        await removeUploadedFile(file.path);

        res.status(400).json({
          code: 40004,
          message: errorMessage,
          data: null,
        });

        return;
      }

      const fileRecord = await ChatFileModel.create({
        ownerId: userId,
        conversationId,
        originalName: req.file.originalname,
        storedName: req.file.filename,
        mimeType: req.file.mimetype,
        size: req.file.size,

        // 数据库保存相对路径，避免绑定本机绝对路径
        path: path.posix.join("uploads", req.file.filename),
        extractedMarkdown,
        status,
      });

      logger.info(
        {
          userId,
          conversationId,
          fileId: fileRecord._id.toString(),
          storedName: fileRecord.storedName,
          mimeType: fileRecord.mimeType,
          size: fileRecord.size,
          hasText: Boolean(fileRecord.extractedMarkdown),
        },
        "聊天文件上传成功",
      );

      res.status(201).json({
        code: 20000,
        message: "上传成功",
        data: {
          fileId: fileRecord._id.toString(),
          name: fileRecord.originalName,
          mimeType: fileRecord.mimeType,
          size: fileRecord.size,
          status: fileRecord.status,
          hasText: Boolean(fileRecord.extractedMarkdown),
          createdAt: fileRecord.createdAt,
        },
      });
    } catch (error) {
      // Multer 已经落盘，但数据库写入失败时，删除残留文件
      await removeUploadedFile(req.file?.path);

      logger.error(
        {
          err: error,
          userId,
          conversationId,
          originalName: req.file?.originalname,
        },
        "聊天文件上传失败",
      );

      if (error instanceof multer.MulterError) {
        if (error.code === "LIMIT_FILE_SIZE") {
          res.status(413).json({
            code: 41300,
            message: "文件不能超过 10MB",
            data: null,
          });

          return;
        }

        if (error.code === "LIMIT_FILE_COUNT") {
          res.status(400).json({
            code: 40001,
            message: "一次只能上传一个文件",
            data: null,
          });

          return;
        }

        res.status(400).json({
          code: 40002,
          message: `文件上传失败：${error.message}`,
          data: null,
        });

        return;
      }

      res.status(400).json({
        code: 40003,
        message: error instanceof Error ? error.message : "文件上传失败",
        data: null,
      });
    }
  },
);

export default router;
