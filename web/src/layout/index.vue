<template>
  <div :class="classObj" class="app-wrapper">
    <div
      v-if="device === 'mobile' && sidebarState.opened"
      class="drawer-bg"
      @click="handleClickOutside"
    />
    <sidebar class="sidebar-container" />
    <div :class="{ hasTagsView: needTagsView }" class="main-container">
      <div :class="{ 'fixed-header': fixedHeader }">
        <navbar />
        <tags-view v-if="needTagsView" />
      </div>
      <app-main />
      <!-- <right-panel v-if="showSettings">
          <settings />
        </right-panel> -->
    </div>
  </div>
</template>
<script lang="ts" setup name="LayoutIndex">
// import RightPanel from "@components/RightPanel";
import { Navbar, Sidebar, AppMain, TagsView } from "./components";
import { computed } from "vue";
import { storeToRefs } from "pinia";
import useResizeHandler from "./mixin/ResizeHandler";
import { useAppStore } from "@/stores/app";
import { useSettingsStore } from "@/stores/settings";

const appStore = useAppStore();
const settingsStore = useSettingsStore();
useResizeHandler();

const { device, sidebar: sidebarState } = storeToRefs(appStore);
const {
  showSettings,
  tagsView: needTagsView,
  fixedHeader,
} = storeToRefs(settingsStore);
const classObj = computed(() => ({
  mobile: device.value === "mobile",
  hideSidebar: !sidebarState.value.opened,
  openSidebar: sidebarState.value.opened,
  withoutAnimation: sidebarState.value.withoutAnimation,
}));

const handleClickOutside = () => {
  appStore.closeSideBar(false);
};
</script>
<style lang="scss" scoped>
@use "@/styles/mixin.scss" as *;
@use "@/styles/variables.scss" as *;

.app-wrapper {
  @include clearfix;
  position: relative;
  height: 100%;
  width: 100%;

  &.mobile.openSidebar {
    position: fixed;
    top: 0;
  }
}

.drawer-bg {
  background: #000;
  opacity: 0.3;
  width: 100%;
  top: 0;
  height: 100%;
  position: absolute;
  z-index: 999;
}

.fixed-header {
  position: fixed;
  top: 0;
  right: 0;
  z-index: 9;
  width: calc(100% - #{$sideBarWidth});
  transition: width 0.28s;
}

.hideSidebar .fixed-header {
  width: calc(100% - 54px);
}

.mobile .fixed-header {
  width: 100%;
}
</style>
