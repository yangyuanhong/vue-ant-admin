import mongoose from 'mongoose'
import { logger } from "../utils/logger.js";

export function connectDb(uri: string | undefined): Promise<void> {
  if (!uri) {
    throw new Error('MONGODB_URI is required')
  }

  return new Promise((resolve, reject) => {
    // 3、连接mongodb服务
    mongoose.connect(uri);

    // 设置连接成功的回调
    mongoose.connection.once("open", () => {
      logger.info("MongoDB 连接成功");
      resolve();
    });

    mongoose.connection.on("error", (error) => {
      logger.error({ err: error }, "MongoDB 连接失败");
      reject(new Error("数据库连接失败"));
    });

    mongoose.connection.on("close", () => {
      logger.warn("MongoDB 连接已关闭");
    });
  })
}
