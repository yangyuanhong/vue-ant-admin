<template>
  <el-scrollbar ref="scrollContainer" :vertical="false" class="scroll-container" @wheel.prevent="handleScroll">
    <slot />
  </el-scrollbar>
</template>
<script lang="ts" setup name="ScrollPane">
import { ElScrollbar } from "element-plus";
import "element-plus/es/components/scrollbar/style/css";
import { computed, onMounted, onUnmounted, ref, useTemplateRef } from "vue";

type TagTarget = HTMLElement | { $el: HTMLElement };

const tagAndTagSpacing = 4;
const { tagList = [] } = defineProps<{
  tagList?: TagTarget[];
}>();
const scroll = useTemplateRef("scrollContainer");
const emit = defineEmits(["scroll"]);

const left = ref(0);

const scrollWrapper = computed(() => scroll.value?.wrapRef ?? null);

const emitScroll = () => {
  emit("scroll");
};

const handleScroll = (e: { wheelDelta: number; deltaY: number }) => {
  const eventDelta = e.wheelDelta || -e.deltaY * 40;
  const scrollElement = scrollWrapper.value;
  if (!scrollElement) return;

  scrollElement.scrollLeft += eventDelta / 4;
};

const getTagElement = (tag: TagTarget) =>
  tag instanceof HTMLElement ? tag : tag.$el;

const moveToTarget = (currentTag: TagTarget) => {
  const container = scroll.value?.$el as HTMLElement | undefined;
  const scrollElement = scrollWrapper.value;
  if (!container || !scrollElement || tagList.length === 0) return;

  const firstTag = getTagElement(tagList[0]);
  const lastTag = getTagElement(tagList[tagList.length - 1]);
  const currentElement = getTagElement(currentTag);

  if (firstTag === currentElement) {
    scrollElement.scrollLeft = 0;
    return;
  }

  if (lastTag === currentElement) {
    scrollElement.scrollLeft = scrollElement.scrollWidth - container.offsetWidth;
    return;
  }

  const currentIndex = tagList.findIndex(
    (tag) => getTagElement(tag) === currentElement,
  );
  if (currentIndex < 0) return;

  const previousTag = tagList[currentIndex - 1];
  const nextTag = tagList[currentIndex + 1];
  if (!previousTag || !nextTag) return;

  const previousElement = getTagElement(previousTag);
  const nextElement = getTagElement(nextTag);
  const afterNextTagOffsetLeft =
    nextElement.offsetLeft + nextElement.offsetWidth + tagAndTagSpacing;
  const beforePreviousTagOffsetLeft =
    previousElement.offsetLeft - tagAndTagSpacing;

  if (
    afterNextTagOffsetLeft >
    scrollElement.scrollLeft + container.offsetWidth
  ) {
    scrollElement.scrollLeft =
      afterNextTagOffsetLeft - container.offsetWidth;
  } else if (beforePreviousTagOffsetLeft < scrollElement.scrollLeft) {
    scrollElement.scrollLeft = beforePreviousTagOffsetLeft;
  }
};

defineExpose({ moveToTarget });

onMounted(() => {
  scrollWrapper.value?.addEventListener("scroll", emitScroll, true);
});

onUnmounted(() => {
  scrollWrapper.value?.removeEventListener("scroll", emitScroll);
});
</script>
<style lang="scss" scoped>
.scroll-container {
  white-space: nowrap;
  position: relative;
  overflow: hidden;
  width: 100%;

  :deep(.el-scrollbar__bar) {
    bottom: 0px;
  }

  :deep(.el-scrollbar__wrap) {
    height: 49px;
  }
}
</style>
