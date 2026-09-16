<template>
  <div :class="className" :style="{ height: height, width: width }">
    <chart :options="options" />
  </div>
</template>
<script lang="ts" setup name="PieChart">
import Chart from "@/components/Chart.vue";
import { reactive } from "vue";
const props = withDefaults(
  defineProps<{
    className?: string;
    width?: string;
    height?: string;
  }>(),
  {
    className: "chart",
    width: "100%",
    height: "300px",
  },
);

let options = reactive({
  tooltip: {
    trigger: "item",
    formatter: "{a} <br/>{b} : {c} ({d}%)",
  },
  legend: {
    left: "center",
    bottom: "10",
    data: ["Industries", "Technology", "Forex", "Gold", "Forecasts"],
  },
  series: [
    {
      name: "WEEKLY WRITE ARTICLES",
      type: "pie",
      roseType: "radius",
      radius: [15, 95],
      center: ["50%", "38%"],
      data: [
        { value: 320, name: "Industries" },
        { value: 240, name: "Technology" },
        { value: 149, name: "Forex" },
        { value: 100, name: "Gold" },
        { value: 59, name: "Forecasts" },
      ],
      animationEasing: "cubicInOut",
      animationDuration: 2600,
    },
  ],
});
</script>
<style scoped></style>
