import jwt from 'jsonwebtoken'
import type { RequestHandler } from 'express'

export const authRequired: RequestHandler = (req, res, next) => {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  try {
    const token = header.slice(7)
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'development-secret') as Express.User
    return next()
  } catch {
    return res.status(401).json({ message: 'Token invalid or expired' })
  }
}

export const adminRequired: RequestHandler = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden' })
  }
  return next()
}
