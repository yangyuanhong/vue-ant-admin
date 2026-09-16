<template>
  <div class="dashboard-container">
    <component :is="currentDashboard" />
  </div>
</template>
<script lang="ts" setup name="DashboardIndex">
import { computed, ComputedRef } from "vue";
import adminDashboard from "./admin/index.vue"
import editorDashboard from "./editor/index.vue"
import { useAuthStore } from "@/stores/auth";


const auth = useAuthStore();
const roles:ComputedRef<string[]> = computed(()=>auth.roles)

const currentDashboard = computed(() => {
  return roles.value.includes('admin')
    ? adminDashboard
    : editorDashboard
})
</script>