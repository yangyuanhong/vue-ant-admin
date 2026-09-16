<template>
  <div :class="props.className" :style="{ height: props.height, width: props.width }">
    <Chart :options="options" :height="props.height" :width="props.width" />
  </div>
</template>
<script lang="ts" setup name="LineChart">
import Chart from "@/components/Chart.vue";
import { ChartData } from "../types";
import { computed, toRefs } from "vue";

const props = withDefaults(
  defineProps<{
    className?: string;
    width?: string;
    height?: string;
    autoResize?: boolean;
    chartData: ChartData;
  }>(),
  {
    className: "line-chart",
    height: "300px",
    width: "100%",
    autoResize: true,
  },
);

const { expectedData, actualData } = toRefs(props.chartData);

let options = computed(()=>({
  xAxis: {
    data: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    boundaryGap: false,
    axisTick: {
      show: false,
    },
  },
  grid: {
    left: 10,
    right: 10,
    bottom: 20,
    top: 30,
    containLabel: true,
  },
  tooltip: {
    trigger: "axis",
    axisPointer: {
      type: "cross",
    },
    padding: [5, 10],
  },
  yAxis: {
    axisTick: {
      show: false,
    },
  },
  legend: {
    data: ["expected", "actual"],
    top: 0,
    left: "center",
    itemGap: 18,
    itemWidth: 12,
    itemHeight: 12,
    textStyle: {
      fontSize: 12,
      color: "#666",
      padding: [0, 0, 0, 0],
    },
    icon: "circle",
  },
  series: [
    {
      name: "expected",
      itemStyle: {
        color: "#FF005A",
        lineStyle: {
          color: "#FF005A",
          width: 2,
        },
      },
      symbol: "circle",
      symbolSize: 5,
      smooth: true,
      type: "line",
      data: expectedData.value,
      animationDuration: 2800,
      animationEasing: "cubicInOut",
    },
    {
      name: "actual",
      smooth: true,
      type: "line",
      itemStyle: {
        color: "#3888fa",
        lineStyle: {
          color: "#3888fa",
          width: 2,
        },
        areaStyle: {
          color: "#f3f8ff",
        },
      },
      symbol: "circle",
      symbolSize: 5,
      data: actualData.value,
      animationDuration: 2800,
      animationEasing: "quadraticOut",
    },
  ],
}));
</script>
<style scoped>
.line-chart {
  width: 100%;
  min-height: 300px;
}
</style>
