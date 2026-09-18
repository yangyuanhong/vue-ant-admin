<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import zhCN from 'ant-design-vue/es/locale/zh_CN'
import { useAppStore } from '@/stores/app';

const settingsStore = useSettingsStore();
const appStore = useAppStore();

onMounted(() => {
  settingsStore.initialize();
})

const themeConfig = computed(() => ({
  token: {
    colorPrimary: settingsStore.primaryColor,
    colorSuccess: '#13ce66',
    colorWarning: '#ffba00',
    colorError: '#ff4949',
    borderColorLight: "#dfe4ed",
    borderColorLighter: "#e6ebf5",
    borderRadius: 4
  }
}));

let size = computed(()=>appStore.size)
</script>

<template>
  <a-config-provider :theme="themeConfig" :locale="zhCN" :component-size="size">
    <router-view />
  </a-config-provider>
</template>
