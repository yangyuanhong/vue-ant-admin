<template>
  <a-dropdown trigger="click">
    <div>
      <svg-icon class-name="size-icon" icon-class="size" />
    </div>
    <template #overlay>
      <a-menu @click="handleSetSize">
        <a-menu-item :key="item.value" :disabled="size===item.value" v-for="item in sizeOptions">{{
          item.label
        }}</a-menu-item>
      </a-menu>
    </template>
  </a-dropdown>
</template>
<script lang="ts" setup name="SizeSelect">
import { computed, nextTick, reactive } from "vue";
import { useAppStore } from "@/stores/app";
import { useRoute, useRouter } from "vue-router";
import { message } from "ant-design-vue";
import { useTagsViewStore } from '../../stores/tagsView';

const sizeOptions = reactive<{ value: string; label: string }[]>([
  { label: "Default", value: "default" },
  { label: "Medium", value: "medium" },
  { label: "Small", value: "small" },
  { label: "Mini", value: "mini" },
]);
const useApp = useAppStore();
const route = useRoute();
const router = useRouter();
const useTagsView = useTagsViewStore();

// 计算属性
const size = computed(() => useApp.size);

// methods
const refreshView = async () => {
  // tagsView
  useTagsView.delAllCachedViews();
  const { fullPath } = route;

  await nextTick();
  router.replace({
    path: "/redirect" + fullPath,
  });
};
const handleSetSize = ({
  key,
}: {
  key: "medium" | "default" | "small" | "mini";
  }): void => {
console.log(key, "size");
  useApp.setSize(key);
  refreshView();
  message.success("Switch Size Success");
  console.log(useApp.size, "--->");
};
</script>
<style scoped>
.ant-dropdown-trigger {
  height: 100%;
  display: inline-flex;
  align-items: center;
  padding: 0 8px;
}
.size-icon {
  display: inline-block;
  cursor: pointer;
  fill: #5a5e66;
  width: 20px;
  height: 20px;
  vertical-align: 10px;
}
</style>
