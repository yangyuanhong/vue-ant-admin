import mongoose from 'mongoose'

export function connectDb(uri) {
  if (!uri) {
    throw new Error('MONGODB_URI is required')
  }

  return new Promise((resolve, reject) => { 
    // 3、连接mongodb服务
    mongoose.connect(uri);

    // 设置连接成功的回调
    mongoose.connection.once("open", () => {
      resolve("连接成功");
    });

    mongoose.connection.on("error", () => {
      reject("数据库连接失败");
    });

    mongoose.connection.on("close", () => {
      console.log("连接关闭");
    });
  })
}
