import RouterDemoPage from "../views/RouterDemoPage.vue";
import VModelDemoPage from "../views/VModelDemoPage.vue";
import LayoutIndex from "@/layout/index.vue";
import { ExtendedRouteRecordRaw } from "@/stores/types/index.js";

export const constantRoutes: ExtendedRouteRecordRaw[] = [
  {
    path: "/redirect",
    component: LayoutIndex,
    name: "redirect",
    meta: {
      hidden: true,
    },
    children: [
      {
        path: "/redirect/:pathMatch(.*)*",
        component: () => import("@/views/redirect/index.vue"),
      },
    ],
  },
  {
    path: "/login",
    name: "Login",
    component: () => import("@/views/login/index.vue"),
    meta: { hidden: true },
  },
  {
    path: "/auth-redirect",
    component: () => import("@/views/login/auth-redirect.vue"),
    meta: { hidden: true },
  },
  {
    path: "/404",
    component: () => import("@/views/error-page/404.vue"),
    meta: { hidden: true },
  },
  {
    path: "/401",
    component: () => import("@/views/error-page/401.vue"),
    meta: { hidden: true },
  },
  {
    path: "/",
    name: "Layout",
    component: LayoutIndex,
    redirect: "/dashboard",
    children: [
      {
        path: "dashboard",
        component: () => import("@/views/dashboard/index.vue"),
        name: "Dashboard",
        meta: { title: "首页", icon: "dashboard", affix: true },
      },
    ],
  },
  {
    path: "/heart",
    component: LayoutIndex,
    name: "langMan",
    redirect: '/heart/index',
    meta: { title: "浪漫", icon: "heart", noCache: false },
    children: [
      {
        path: "index",
        component: () => import("@/views/heart/index.vue"),
        name: "ParticleHeart",
        meta: { title: "粒子比心", icon: "heart", noCache: true },
      },
      {
        path: "rose",
        component: () => import("@/views/rose/index.vue"),
        name: "ParticleRose",
        meta: { title: "粒子送玫瑰", icon: "rose", noCache: true },
      },
    ],
  },
  {
    path: "/documentation",
    component: LayoutIndex,
    children: [
      {
        path: "index",
        component: () => import("@/views/documentation/index.vue"),
        name: "Documentation",
        meta: { title: "文档", icon: "documentation", affix: true },
      },
    ],
  },
  {
    path: "/router-demo/query",
    name: "router-query",
    component: RouterDemoPage,
  },
  {
    path: "/router-demo/user/:id",
    name: "router-params",
    component: RouterDemoPage,
  },
  {
    path: "/router-demo/params-lost",
    name: "router-params-lost",
    component: RouterDemoPage,
  },
  {
    path: "/v-model-demo",
    name: "v-model-demo",
    component: VModelDemoPage,
  },
  {
    path: "/:pathMatch(.*)*",
    name: "NotFound",
    component: () => import("@/views/error-page/404.vue"),
    meta: { hidden: true },
  },
];

// Routes requiring role-based filtering. Keep constant routes separate so
// permissionStore.generateRoutes() has actual dynamic routes to process.
export const asyncRoutes: ExtendedRouteRecordRaw[] = [
  {
    path: "/icon",
    component: LayoutIndex,
    children: [
      {
        path: "index",
        component: () => import("@/views/icons/index.vue"),
        name: "Icons",
        meta: { title: "图标", icon: "icon", noCache: true },
      },
    ],
  },
];
