import api from "@/utils/axios";

export function getInfo(token:string) { 
  return api({
    url: "/user/info",
    method: "get",
    params: { token }
  })
}