<template>
  <div v-if="!item.hidden">
    <template
      v-if="
        hasOneShowingChild(item.children, item) &&
        (!onlyOneChild.children || onlyOneChild.noShowingChildren) &&
        !item.alwaysShow
      "
    >
      <app-link v-if="onlyOneChild.meta" :to="resolvePath(onlyOneChild.path)">
        <a-menu-item
          :key="resolvePath(onlyOneChild.path)"
          :class="{ 'submenu-title-noDropdown': !isNest }"
        >
          <item
            :icon="onlyOneChild.meta.icon || (item.meta && item.meta.icon)"
            :title="onlyOneChild.meta.title"
          />
        </a-menu-item>
      </app-link>
    </template>

    <a-sub-menu
      v-else
      ref="subMenu"
      :key="resolvePath(item.path)"
    >
      <template #title>
        <item
          v-if="item.meta"
          :icon="item.meta && item.meta.icon"
          :title="item.meta.title"
        />
      </template>
      <sidebar-item
        v-for="child in item.children"
        :key="child.path"
        :is-nest="true"
        :item="child"
        :base-path="resolvePath(child.path)"
        class="nest-menu"
      />
    </a-sub-menu>
  </div>
</template>
<script lang="ts" setup name="SidebarItem">
import { isExternal } from "@/utils/validate";
import Item from "./Item.vue";
import AppLink from "./Link.vue";
import FixiOSBug from "./FixiOSBug"
import { ref } from 'vue';
import { ExtendedRouteRecordRaw } from '@/stores/types';

const { item, isNest = false, basePath = "" } = defineProps<{
  item: ExtendedRouteRecordRaw;
  isNest?: boolean;
  basePath: string;
}>()
const onlyOneChild = ref<ExtendedRouteRecordRaw>({} as ExtendedRouteRecordRaw);
const hasOneShowingChild = (children: ExtendedRouteRecordRaw[] = [], parent: ExtendedRouteRecordRaw) => {
  const showingChildren = children.filter(item => {
    if (item.hidden) {
      return false;
    } else {
      onlyOneChild.value = item;
      return true
    }
  })

  if (showingChildren.length === 1) {
    return true;
  }

  if (showingChildren.length === 0) {
    onlyOneChild.value = { ...parent, path: "", noShowingChildren: true }
    return true;
  }

  return false;
};
const resolvePath = (routePath: string)=> {
  if (isExternal(routePath)) {
    return routePath;
  }
  if (isExternal(basePath)) {
    return basePath;
  }
  const joined = `${basePath}/${routePath}`.replace(/\\+/g, "/");
  return `/${joined}`.replace(/\/+/g, "/").replace(/\/$/, "") || "/";
}

FixiOSBug();
</script>
<style scoped></style>
