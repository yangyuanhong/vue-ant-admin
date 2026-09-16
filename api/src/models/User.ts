import mongoose from 'mongoose'

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['editor', 'admin'], default: 'user' },
    avatar: String,
    introduction: String,
  },
  { timestamps: true }
)

export const User = mongoose.model('User', userSchema)
