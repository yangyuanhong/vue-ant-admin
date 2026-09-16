<template>
  <div
    v-if="external"
    :style="styleExternalIcon"
    class="svg-external-icon svg-icon"
    
  />
  <svg v-else :class="svgClass" aria-hidden="true" >
    <use :xlink:href="iconName" />
  </svg>
</template>
<script lang="ts" setup name="SvgIcon">
import { isExternal } from "@/utils/validate";
import { computed } from "vue";

const { iconClass, className } = defineProps<{
  iconClass: string;
  /** Optional additional CSS class. */
  className?: string;
}>();

const external = computed(() => isExternal(iconClass));
const iconName = computed(() => `#icon-${iconClass}`);
const svgClass = computed(() => {
  if (className) {
    return "svg-icon " + className;
  } else {
    return "svg-icon";
  }
});
const styleExternalIcon = computed(() => {
  return {
    mask: `url(${iconClass}) no-repeat 50% 50%`,
    "-webkit-mask": `url(${iconClass}) no-repeat 50% 50%`,
  };
});
</script>
<style scoped>
.svg-icon {
  width: 1em;
  height: 1em;
  vertical-align: -0.15em;
  fill: currentColor;
  overflow: hidden;
}
</style>
