import mongoose from 'mongoose'

export function connectDb(uri: string | undefined): Promise<void> {
  if (!uri) {
    throw new Error('MONGODB_URI is required')
  }

  return new Promise((resolve, reject) => {
    // 3、连接mongodb服务
    mongoose.connect(uri);

    // 设置连接成功的回调
    mongoose.connection.once("open", () => {
      resolve();
    });

    mongoose.connection.on("error", () => {
      reject(new Error("数据库连接失败"));
    });

    mongoose.connection.on("close", () => {
      console.log("连接关闭");
    });
  })
}
