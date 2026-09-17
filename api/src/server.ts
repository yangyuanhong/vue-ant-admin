import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from "path"
import { fileURLToPath } from "url"
import authRouter from './routes/auth.js'
import transactionRouter from "./routes/transaction.js"
import { connectDb } from './config/db.js'

dotenv.config({ path: new URL('../.env', import.meta.url) })
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webDist = path.resolve(__dirname, "../../web/dist")


const app = express()
const port = process.env.PORT || 3000

app.use(cors())
app.use(express.json())
app.use(express.static(webDist));

//history模式基于HTML5 History AP,URL更美观，没有#但是刷新会真实请求对应路径，所以需要后端配置fallback，把请求都返回到index.html
app.get("*", (req, res, next) => { 
  if (req.path.startsWith("/api") || req.path === "/health") { 
    return next();
  }

  res.sendFile(path.join(webDist, "index.html"))
})

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'quiz-api' })
})


app.use('/api/auth', authRouter)
app.use('/api/tran', transactionRouter)

await connectDb(process.env.MONGODB_URI)

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`)
})
