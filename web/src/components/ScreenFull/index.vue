<template>
  <div class="index">
    
  </div>
</template>
<script lang="ts" setup name="ScreenFull">
import screenfull from "screenfull";
import { onMounted, onBeforeUnmount, ref } from 'vue';
import { message } from 'ant-design-vue';

let isFullscreen = ref<boolean>(false);
const init = () => {
  if (screenfull.isEnabled) {
    screenfull.on("change", change)
  }
}
const change = () => {
  isFullscreen.value = screenfull.isFullscreen;
};

const click = () => {
  if (!screenfull.isEnabled) {
      message.warning('you browser can not work');
    return false
  }
  screenfull.toggle();
}

const destroy = () => {
  if (screenfull.isEnabled) {
    screenfull.off("change", change)
  }
}

onMounted(() => init());
onBeforeUnmount(destroy)
</script>
<style scoped>
</style>
