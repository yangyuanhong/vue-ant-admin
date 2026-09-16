import { defineStore } from "pinia";
import { asyncRoutes, constantRoutes } from "@/router/routes";
import { ExtendedRouteRecordRaw } from "./types";

/**
 * Use meta.role to determine if the current user has permission
 * @param roles
 * @param route
 */
function hasPermission(roles: string[], route: ExtendedRouteRecordRaw) {
  const meta = route.meta;
  if (meta && meta.roles) {
    return roles.some((role) => meta.roles?.includes(role));
  } else {
    return true;
  }
}

/**
 * 通过递归过滤异步路由表
 * @param routes asyncRoutes
 * @param roles
 */
export function filterAsyncRoutes(
  routes: ExtendedRouteRecordRaw[],
  roles: string[],
) {
  const res: ExtendedRouteRecordRaw[] = [];

  routes.forEach((route) => {
    const tmp = { ...route };
    if (hasPermission(roles, tmp)) {
      if (tmp.children) {
        tmp.children = filterAsyncRoutes(tmp.children, roles);
      }
      res.push(tmp);
    }
  });
  return res;
}

export const usePermissionStore = defineStore("permission", {
  state: function (): {
    routes: ExtendedRouteRecordRaw[];
    addRoutes: ExtendedRouteRecordRaw[];
  } {
    return {
      routes: [],
      addRoutes: [],
    };
  },
  actions: {
    generateRoutes(roles: string[]): ExtendedRouteRecordRaw[] {
      const accessedRoutes = roles.includes("admin")
        ? asyncRoutes
        : filterAsyncRoutes(asyncRoutes, roles);
      this.addRoutes = accessedRoutes;
      return accessedRoutes;
    },
    setRoutes(accessedRoutes: ExtendedRouteRecordRaw[]) {
      this.routes = constantRoutes.concat(accessedRoutes);
    },
  },
});
