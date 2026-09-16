<template>
  <a v-if="external" :href="to" target="_blank" rel="noopener noreferrer">
    <slot />
  </a>
  <router-link v-else :to="to">
    <slot />
  </router-link>
</template>
<script lang="ts" setup name="Link">
import { computed } from "vue";
import { isExternal } from "@/utils/validate";

const { to } = defineProps<{ to: string }>();
const external = computed(() => isExternal(to));
</script>
