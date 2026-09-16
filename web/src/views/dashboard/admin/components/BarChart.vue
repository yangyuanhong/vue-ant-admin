<template>
  <div :class="className" :style="{ height: height, width: width }">
    <chart :options="options" />
  </div>
</template>
<script lang="ts" setup name="PieChart">
import Chart from "@/components/Chart.vue";
import { reactive } from "vue";
const animationDuration = 3000;

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
    trigger: "axis",
    axisPointer: {
      // 坐标轴指示器，坐标轴触发有效
      type: "shadow", // 默认为直线，可选为：'line' | 'shadow'
    },
  },
  grid: {
    top: 10,
    left: "2%",
    right: "2%",
    bottom: "3%",
    containLabel: true,
  },
  xAxis: [
    {
      type: "category",
      data: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      axisTick: {
        alignWithLabel: true,
      },
    },
  ],
  yAxis: [
    {
      type: "value",
      axisTick: {
        show: false,
      },
    },
  ],
  series: [
    {
      name: "pageA",
      type: "bar",
      stack: "vistors",
      barWidth: "60%",
      data: [79, 52, 200, 334, 390, 330, 220],
      animationDuration,
    },
    {
      name: "pageB",
      type: "bar",
      stack: "vistors",
      barWidth: "60%",
      data: [80, 52, 200, 334, 390, 330, 220],
      animationDuration,
    },
    {
      name: "pageC",
      type: "bar",
      stack: "vistors",
      barWidth: "60%",
      data: [30, 52, 200, 334, 390, 330, 220],
      animationDuration,
    },
  ],
});
</script>
<style scoped></style>
