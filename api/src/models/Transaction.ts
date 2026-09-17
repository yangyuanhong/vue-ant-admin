import mongoose from "mongoose";
import { v4 as uuidv4 } from 'uuid'

const TransactionSchema = new mongoose.Schema(
  {
    order_no: { type: String, default: () => uuidv4(),
      unique: true
    },
    timeStamp: Date,
    username: { type: String, require: true },
    price: { type: Number, require: true },
    status: { type: String, enum:["0", "1"]}
  }
)

export const Transaction = mongoose.model('TransactionSchema', TransactionSchema)