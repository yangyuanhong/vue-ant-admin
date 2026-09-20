import { debounce } from "@/utils";
import type { ECharts } from "echarts/core";
import { onActivated, onBeforeUnmount, onDeactivated, onMounted, ref } from "vue";

type ResizeableChart = {
  resize: () => void;
};

export default function useChartResize(chart: ECharts | null = null) {
  const sidebarElm = ref<Element | null>(null);
  let resizeHandler: (() => void) | null = null;

  const initResizeEvent = () => {
    if (!resizeHandler) return;
    window.addEventListener("resize", resizeHandler);
  };

  const destroyResizeEvent = () => {
    if (!resizeHandler) return;
    chart?.dispose();
    window.removeEventListener("resize", resizeHandler);
  };

  const sidebarResizeHandler = (e: Event) => {
    const transitionEvent = e as TransitionEvent;

    if (transitionEvent.propertyName === "width") {
      resizeHandler?.();
    }
  };

  const initSidebarResizeEvent = () => {
    const el = document.getElementsByClassName("sidebar-container")[0];
    if (!el) return;

    sidebarElm.value = el;
    el.addEventListener("transitionend", sidebarResizeHandler);
  };

  const destroySidebarResizeEvent = () => {
    sidebarElm.value?.removeEventListener("transitionend", sidebarResizeHandler);
    sidebarElm.value = null;
  };

  onMounted(() => {
    resizeHandler = debounce(() => {
      chart?.resize();
    }, 100);

    initResizeEvent();
    initSidebarResizeEvent();
  });

  onBeforeUnmount(() => {
    destroyResizeEvent();
    destroySidebarResizeEvent();
  });

  onActivated(() => {
    initResizeEvent();
    initSidebarResizeEvent();
  });

  onDeactivated(() => {
    destroyResizeEvent();
    destroySidebarResizeEvent();
  });
}
