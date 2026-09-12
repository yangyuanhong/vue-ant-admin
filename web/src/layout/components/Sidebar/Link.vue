<template>
  <component :is="type" v-bind="linkProps(to)">
    <slot />
  </component>
</template>
<script lang="ts" setup name="Link">
import { computed } from "vue";
import { isExternal } from "@/utils/validate";

const { to } = defineProps<{ to: string }>();
const external = computed(() => isExternal(to));
const type = computed(() => {
  if (external.value) {
    return "a";
  }
  return "router-link";
});

const linkProps = (to: string) => {
  if (external) {
    return {
      href: to,
      target: "_blank",
      rel: "noopener",
    };
  }
  return {
    to: to,
  };
};
</script>
