<template>
  <a-breadcrumb class="app-breadcrumb" separator="/">
      <a-breadcrumb-item v-for="(item, index) in levelList" :key="item.path">
        <span
          v-if="
            item.redirect === 'noRedirect' || index === levelList.length - 1
          "
          class="no-redirect"
        >
          {{ item.meta.title }}</span
        >
        <a v-else @click.prevent="handleLink(item)">{{ item.meta.title }}</a>
      </a-breadcrumb-item>
  </a-breadcrumb>
</template>
<script lang="ts" setup name="BreadCrumb">
import pathToRegexp from "path-to-regexp";
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
  const name = route && route.name;
  if (!name) {
  return name === "Dashboard";
  }
};

const getBreadcrumb = () => {
  let matched: BreadcrumbRoute[] = route.matched.filter((item) => item.meta?.title);
  const first = matched[0];

  if (!isDashboard(first)) {
    matched = [
      { path: "/dashboard", meta: { title: "Dashboard" } } as BreadcrumbRoute,
      ...matched,
    ];
  }

  levelList.value = matched.filter(
    (item) => !!item.meta?.title && item.meta.breadcrumb !== false,
  );
};

const pathCompile = (path: string) => {
  const { params } = route;
  const toPath = pathToRegexp.compile(path);
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
  display: inline-block;
  font-size: 14px;
  line-height: 50px;
  margin-left: 8px;

  .no-redirect {
    color: #97a8be;
    cursor: text;
  }
}
</style>
