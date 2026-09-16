import { createRouter, createWebHistory, RouteRecordRaw } from "vue-router";
import { constantRoutes } from './routes'


const router = createRouter({
  history: createWebHistory(),
  routes: constantRoutes as RouteRecordRaw[]
});

// 记录动态路由名称
const asyncRouteNames:Set<string> = new Set();

export function addAsyncRoute(route:RouteRecordRaw) { 
  if (route.name) { 
    asyncRouteNames.add(route.name as string)
  }

  router.addRoute(route)
}

export function resetRouter() { 
  asyncRouteNames.forEach((name:string) => { 
    if (router.hasRoute(name)) { 
      router.removeRoute(name)
    }
  })
  asyncRouteNames.clear();
}


router.beforeEach((to) => {
  const token = localStorage.getItem("quiz_token");
  if (to.path !== "/login" && !token) return "/login";
  if (to.path === "/login" && token) return "/";
});

export default router;
