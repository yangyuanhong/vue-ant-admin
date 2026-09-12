<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { theme } from 'ant-design-vue'
import { useSettingsStore } from '@/stores/settings'

const settingsStore = useSettingsStore()

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
}))
</script>

<template>
  <a-config-provider :theme="themeConfig">
    <router-view />
  </a-config-provider>
</template>
