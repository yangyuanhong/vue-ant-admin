<template>
  <div :class="{ 'has-logo': showLogo }">
    <logo v-if="showLogo" :collapse="isCollapse" />
    <el-scrollbar wrap-class="scrollbar-wrapper">
      <a-menu
        :selected-keys="[activeMenu]"
        :inline-collapsed="isCollapse"
        :theme="'dark'"
        mode="inline"
      >
        <sidebar-item v-for="route in permission_routes" :key="route.path" :item="route" :base-path="route.path" />
      </a-menu>
    </el-scrollbar>
  </div>
</template>
<script lang="ts" setup name="SidebarIndex">
import { computed, ref } from "vue";
import { useRoute, useRouter } from 'vue-router'
import { ElScrollbar } from "element-plus";
import "element-plus/es/components/scrollbar/style/css";
import variablesStyle from "@/styles/variables.module.scss";
import Logo from "./Logo.vue";
import { storeToRefs } from "pinia";
import { useAppStore } from "@/stores/app";
import { useSettingsStore } from "@/stores/settings";
import { usePermissionStore } from "@/stores/permission";
import SidebarItem from './SidebarItem.vue'

const { sidebar } = storeToRefs(useAppStore());
const { sidebarLogo } = storeToRefs(useSettingsStore());
const permissionStore = usePermissionStore();
const permission_routes = computed(() => permissionStore.routes);

const openKeys = ref<string[]>([])

const showLogo = computed(() => sidebarLogo.value);
const isCollapse = computed(() => !sidebar.value.opened);
const activeMenu = computed(() => {
  const { meta, path } = useRoute();
  const activeMenu = meta.activeMenu;
  if (activeMenu) {
    return activeMenu
  }
  return path
});
</script>
<style scoped></style>
