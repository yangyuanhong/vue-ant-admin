import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { User } from '../models/User.js'
import { authRequired } from '../middleware/auth.js'

const router = Router()

const usernamePattern = /^[A-Za-z0-9_]{4,20}$/
const passwordPattern = /^[A-Za-z0-9_!@#$%^&*]{6,20}$/

function validateCredentials(username: unknown, password: unknown): string {
  if (!username || !password) {
    return '用户名和密码不能为空'
  }
  if (typeof username !== 'string' || typeof password !== 'string') return '用户名和密码不能为空'
  if (!usernamePattern.test(username)) {
    return '用户名只能包含字母、数字和下划线，长度 4 到 20 位'
  }
  if (!passwordPattern.test(password)) {
    return '密码只能包含字母、数字和部分符号，长度 6 到 20 位'
  }
  return ''
}

router.post('/login', async (req, res) => {
  const { username, password } = req.body ?? {}
  const validationMessage = validateCredentials(username, password)
  if (validationMessage) {
    return res.status(400).json({ message: validationMessage })
  }

  const user = await User.findOne({ username })
  if (user && !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ message: '账号或密码错误' })
  }

  const currentUser =
    user ??
    (await User.create({
      username,
      passwordHash: await bcrypt.hash(password, 10),
      role: 'admin',
      introduction: 'I am a super administrator',
      avatar: "https://wpimg.wallstcn.com/f778738c-e4f8-4870-b634-56703b4acafe.gif"
    }))

  const token = jwt.sign(
    { sub: currentUser._id.toString(), username: currentUser.username, role: currentUser.role },
    process.env.JWT_SECRET || 'development-secret',
    { expiresIn: '7d' }
  )

  return res.json({
    token,
    user: {
      id: currentUser._id,
      username: currentUser.username,
      role: currentUser.role
    }
  })
})

router.get('/me', authRequired, async (req, res) => {
  const user = await User.findById(req.user!.sub).select('username role createdAt')
  if (!user) {
    return res.status(404).json({ message: 'User not found' })
  }
  return res.json({ user })
})

router.get("/info", authRequired, async (req, res) => {
  const user = await User.findById(req.user!.sub).select('username role avatar introduction')
  if (!user) return res.status(404).json({ message: 'User not found' })
  return res.json({
    roles: [user.role],
    name: user.username,
    avatar: user.avatar,
    introduction: user.introduction,
  })
})

export default router
