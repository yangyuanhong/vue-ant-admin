import api from "@/utils/axios";
import { Response } from "@/views/dashboard/admin/types";

export function transactionList():Promise<Response> {
  return api({
    url: '/tran/transaction',
    method: 'get',
  })
}