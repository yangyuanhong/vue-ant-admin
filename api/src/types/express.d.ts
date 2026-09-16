declare global {
  namespace Express {
    interface User {
      sub: string
      username: string
      role: string
    }
    interface Request {
      user?: User
    }
  }
}
export {}
