import router from "@/router/index";
import { message } from "ant-design-vue";
import NProgress from "nprogress";
import "nprogress/nprogress.css"; // progress bar style
import { getToken } from "./utils/auth";
import getPageTitle from "@/utils/get-page-title";
import { ExtendedRouteRecordRaw } from "./stores/types";
import { useAuthStore } from "@/stores/auth";
import { usePermissionStore } from "@/stores/permission";
import { RouteRecordRaw } from "vue-router";

NProgress.configure({ showSpinner: false });

const whiteList = ["/login", "/auth-redirect"];

router.beforeEach(async (to, from, next) => {
  NProgress.start();

  const title = typeof to.meta?.title === "string" ? to.meta.title : "";
  document.title = getPageTitle(title);

  const hasToken = getToken();

  if (hasToken) {
    if (to.path === "/login") {
      next({ path: "/" });
      NProgress.done();
    } else {
      const useAuth = useAuthStore();
      const usePermission = usePermissionStore();
      const roles = useAuth.roles;

      const hasRoles = roles && roles.length > 0;

      if (hasRoles) {
        next();
      } else {
        try {
          const { roles } = await useAuth.getInfo();
          const accessRoutes = usePermission.generateRoutes(roles);
          accessRoutes.forEach((route: ExtendedRouteRecordRaw) => {
            router.addRoute(route as RouteRecordRaw);
          });
          usePermission.setRoutes(accessRoutes);
          next({
            path: to.path,
            query: to.query,
            hash: to.hash,
            replace: true,
          });
        } catch (error) {
          useAuth.resetToken();
          const errorMessage =
            error instanceof Error ? error.message : String(error || "has Error");
          message.error(errorMessage);
          NProgress.done();
        }
      }
    }
  } else {
    if (whiteList.indexOf(to.path) !== -1) {
      next();
    } else {
      next(`/login?redirect=${to.path}`)
      NProgress.done();
    }
  }
});

router.afterEach(() => {
  // finish progress bar
  NProgress.done()
})
