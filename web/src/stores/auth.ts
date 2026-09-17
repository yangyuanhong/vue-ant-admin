import { defineStore } from "pinia";
import api from "../utils/axios";
import { getInfo } from "@/api/user";
import router, { resetRouter } from "@/router";
import type { RouteRecordRaw } from "vue-router";
import { usePermissionStore } from "@/stores/permission";
import { ExtendedRouteRecordRaw } from "./types";
import { removeToken } from "@/utils/auth";

export const useAuthStore = defineStore("auth", {
  state: () => ({
    token: localStorage.getItem("quiz_token") || "",
    user: null as null | { id: string; username: string; role: string },
    roles: [] as string[],
    name: "",
    avatar:
      "https://wpimg.wallstcn.com/f778738c-e4f8-4870-b634-56703b4acafe.gif",
    introduction: "",
  }),
  actions: {
    async login(username: string, password: string) {
      const response = await api.post("/auth/login", { username, password });
      const data = response.data ?? response;
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
            const data = response.data ?? response;

            if (!data) {
              reject(new Error("Verification failed, please Login again."));
              return;
            }

            const { roles, name, avatar, introduction } = data;

            if (!roles || roles.length <= 0) {
              reject(new Error("getInfo: roles must be a non-null array!"));
              return;
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

      console.log(roles, "roles");
      resetRouter();

      const permissionStore = usePermissionStore();
      const accessRoutes = permissionStore.generateRoutes(roles);
      accessRoutes.forEach((route: ExtendedRouteRecordRaw) => {
        router.addRoute(route as RouteRecordRaw);
      });
      permissionStore.setRoutes(accessRoutes);

      // 移除所有的delAllViews
    },

    resetToken() {
      this.token = "";
      this.roles = [];
      removeToken();
    },
  },
});
