<template>
  <a-breadcrumb class="app-breadcrumb" separator="/">
    <a-breadcrumb-item v-for="(item, index) in levelList" :key="item.path">
      <span
        v-if="item.redirect === 'noRedirect' || index === levelList.length - 1"
        class="no-redirect"
      >
        {{ item.meta.title }}</span
      >
      <a v-else @click.prevent="handleLink(item)">{{ item.meta.title }}</a>
    </a-breadcrumb-item>
  </a-breadcrumb>
</template>
<script lang="ts" setup name="BreadCrumb">
import { compile } from "path-to-regexp";
import { ref, watch, onMounted } from "vue";
import { useRoute, useRouter, type RouteLocationMatched } from "vue-router";

type BreadcrumbRoute = {
  path: string;
  name?: RouteLocationMatched["name"];
  redirect?: RouteLocationMatched["redirect"];
  meta: RouteLocationMatched["meta"] & { title?: string };
};
const levelList = ref<BreadcrumbRoute[]>([]);
const route = useRoute();
const router = useRouter();

watch(route, () => {
  if (route.path.startsWith("/redirect")) {
    return;
  }

  getBreadcrumb();
});

onMounted(() => {
  getBreadcrumb();
});

const isDashboard = (route?: BreadcrumbRoute) => {
  return route?.name === "Dashboard";
};

const getBreadcrumb = () => {
  let matched: BreadcrumbRoute[] = route.matched.filter(
    (item) => item.meta?.title,
  );
  const first = matched[0];

  if (!isDashboard(first)) {
    matched = [
      { path: "/dashboard", meta: { title: "首页" } } as BreadcrumbRoute,
      ...matched,
    ];
  }

  levelList.value = matched.filter(
    (item) => !!item.meta?.title && item.meta.breadcrumb !== false,
  );
};

const pathCompile = (path: string) => {
  const { params } = route;
  const toPath = compile(path);
  return toPath(params);
};

const handleLink = (item: BreadcrumbRoute) => {
  const { redirect, path } = item;
  if (redirect) {
    if (typeof redirect === "string") router.push(redirect);
    return;
  }
  router.push(pathCompile(path));
};
</script>
<style lang="scss" scoped>
.app-breadcrumb {
  display: inline-flex;
  align-items: center;
  height: 100%;
  font-size: 14px;
  line-height: 2;
  margin-left: 8px;

  :deep(.ant-breadcrumb-item),
  :deep(.ant-breadcrumb-link),
  :deep(.ant-breadcrumb-separator) {
    display: inline-flex;
    align-items: center;
  }

  .no-redirect {
    color: #97a8be;
    cursor: text;
  }

  :deep(.ant-breadcrumb-link a){
    padding: 0 6px;
    height: 28px;
  }
}
</style>
