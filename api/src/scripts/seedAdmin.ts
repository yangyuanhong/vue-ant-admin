import dotenv from 'dotenv'
import bcrypt from 'bcryptjs'
import { connectDb } from '../config/db.js'
import { User } from '../models/User.js'

dotenv.config({ path: new URL('../../.env', import.meta.url) })

await connectDb(process.env.MONGODB_URI)

const username = process.env.SEED_ADMIN_USERNAME || 'admin'
const password = process.env.SEED_ADMIN_PASSWORD || 'admin123'

const exists = await User.findOne({ username })
if (!exists) {
  const passwordHash = await bcrypt.hash(password, 10)
  await User.create({ username, passwordHash, role: 'admin' })
  console.log(`Seeded admin user: ${username}`)
} else {
  console.log(`Admin user already exists: ${username}`)
}

process.exit(0)
