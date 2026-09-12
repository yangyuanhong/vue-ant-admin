import { defineStore } from "pinia";
import api from "../utils/axios";
import { getInfo } from "@/api/user";
import router, { resetRouter } from "@/router";
import { usePermissionStore } from "@/stores/permission";
import { ExtendedRouteRecordRaw } from "./types";

export const useAuthStore = defineStore("auth", {
  state: () => ({
    token: localStorage.getItem("quiz_token") || "",
    user: null as null | { id: string; username: string; role: string },
    roles: [],
    name: "",
    avatar: "https://wpimg.wallstcn.com/f778738c-e4f8-4870-b634-56703b4acafe.gif",
    introduction: "",
  }),
  actions: {
    async login(username: string, password: string) {
      const { data } = await api.post("/auth/login", { username, password });
      this.token = data.token;
      this.user = data.user;
      localStorage.setItem("quiz_token", data.token);
    },
    logout() {
      this.token = "";
      this.user = null;
      localStorage.removeItem("quiz_token");
    },
    getInfo(): Promise<{ roles: string[] }> {
      return new Promise((resolve, reject) => {
        getInfo(this.token)
          .then((response) => {
            const { data } = response;

            if (!data) {
              reject("Verification failed, please Login again.");
            }

            const { roles, name, avatar, introduction } = data;

            if (!roles || roles.length <= 0) {
              reject("getInfo: roles must be a non-null array!");
            }

            this.roles = roles;
            this.name = name;
            this.avatar = avatar;
            this.introduction = introduction;
            resolve(data);
          })
          .catch((error) => {
            reject(error);
          });
      });
    },

    async changeRoles(role: string) {
      const token = role + "-token";

      this.token = token;
      localStorage.setItem("quiz_token", token);

      const { roles } = await this.getInfo();

      resetRouter();

      const accessRoutes = await usePermissionStore().generateRoutes(roles);
      accessRoutes.forEach((route: ExtendedRouteRecordRaw) => {
        router.addRoute(route);
      });

      // 移除所有的delAllViews
    },
  },
});
