import api from "@/utils/axios";
import { Response } from "@/views/dashboard/admin/types";

export function transactionList():Promise<Response> {
  return api({
    url: '/transaction/list',
    method: 'get',
  })
}