import api from "@/utils/axios";

export function getInfo(_token: string) {
  return api({
    url: "/auth/info",
    method: "get",
  })
}
