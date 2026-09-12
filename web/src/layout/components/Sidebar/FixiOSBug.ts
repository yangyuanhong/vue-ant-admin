import { computed, onMounted, useTemplateRef } from "vue";
import { useAppStore } from "@/stores/app";

export default function () {
  const appStore = useAppStore();
  const device = computed(() => appStore.device);

  onMounted(() => {
    const $subMenu = useTemplateRef("subMenu") as any;
    if ($subMenu) {
      const handleMouseleave = $subMenu.handleMouseleave;
      $subMenu.handleMouseleave = (e: Event) => {
        if (device.value === "mobile") {
          return;
        }
        handleMouseleave(e);
      };
    }
  });
}
