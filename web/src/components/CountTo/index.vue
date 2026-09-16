<template>
  <span v-bind="attrs">{{ formattedValue }}</span>
</template>

<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, ref, useAttrs, watch } from "vue";

const props = withDefaults(
  defineProps<{
    startVal?: number;
    endVal?: number;
    duration?: number;
  }>(),
  {
    startVal: 0,
    endVal: 0,
    duration: 2000,
  },
);

const attrs = useAttrs();
const displayValue = ref(props.startVal);
const animationFrame = ref<number | null>(null);
const startTime = ref<number | null>(null);

const formattedValue = computed(() => {
  const value = Number.isFinite(displayValue.value) ? displayValue.value : 0;
  return Math.round(value).toLocaleString();
});

const cancelAnimation = () => {
  if (animationFrame.value !== null) {
    cancelAnimationFrame(animationFrame.value);
    animationFrame.value = null;
  }
};

const animate = (timestamp: number) => {
  if (startTime.value === null) {
    startTime.value = timestamp;
  }

  const elapsed = timestamp - startTime.value;
  const progress = Math.min(elapsed / Math.max(props.duration, 1), 1);
  const currentValue =
    props.startVal + (props.endVal - props.startVal) * progress;

  displayValue.value = currentValue;

  if (progress < 1) {
    animationFrame.value = requestAnimationFrame(animate);
  } else {
    displayValue.value = props.endVal;
    animationFrame.value = null;
  }
};

const startAnimation = () => {
  cancelAnimation();
  startTime.value = null;
  displayValue.value = props.startVal;
  animationFrame.value = requestAnimationFrame(animate);
};

watch(
  () => [props.startVal, props.endVal, props.duration],
  () => {
    startAnimation();
  },
  { immediate: true },
);

onMounted(() => {
  startAnimation();
});

onBeforeUnmount(() => {
  cancelAnimation();
});
</script>
