import LoginPage from "../views/LoginPage.vue";
import HomePage from "../views/HomePage.vue";
import RouterDemoPage from "../views/RouterDemoPage.vue";
import VModelDemoPage from "../views/VModelDemoPage.vue";
import LayoutIndex from "@/layout/index.vue";
import { ExtendedRouteRecordRaw } from "@/stores/types";


export const constantRoutes:ExtendedRouteRecordRaw[] = [
  {
    path: "/redirect",
    component: LayoutIndex,
    name:"redirect",
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
  { path: "/", name:"Layout", component: LayoutIndex },
  { path: "/login",name:"Login", component: LoginPage },
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
];

export const asyncRoutes = [];