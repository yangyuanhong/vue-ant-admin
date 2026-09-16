<template>
  <div class="icons-container">
    <!-- <aside>
      <a href="https://panjiachen.github.io/vue-element-admin-site/guide/advanced/icon.html">添加和使用</a>
    </aside> -->
    <a-tabs v-model:activeKey="activeKey">
      <a-tab-pane key="1" tab="Tab 1">Icons</a-tab-pane>
      <a-tab-pane key="2" tab="Tab 2" force-render
        >Ant-design-vue Icons</a-tab-pane
      >
    </a-tabs>
  </div>
</template>
<script lang="ts" setup name="IconIndex">
import antIcons from "./ant-icons";
import svgIcons from "./svg-icons";
import clipboard from "@/utils/clipboard";
import { ref } from "vue";

const activeKey = ref("1");
const generateIconCode = (symbol: string) => {
  return `<svg-icon icon-class=${symbol} />`;
};

const generateElementIconCode = (symbol: string) => {
  return `<${symbol} />`;
};

const handleClipboard = (text: string, event: MouseEvent) => {
  clipboard(text, event);
};
</script>
<style scoped></style>
