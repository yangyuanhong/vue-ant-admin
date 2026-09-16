<template>
  <div
    ref="chartRef"
    class="chart"
    :style="{ height: props.height, width: props.width }"
  ></div>
</template>
<script lang="ts" setup name="ChartsIndex">
import { nextTick, onMounted, watch, useTemplateRef } from "vue";
import * as echarts from "echarts";
import useChartResize from "./mixins/resize";

const props = withDefaults(
  defineProps<{
    options: Record<string, any>;
    height?: string;
    width?: string;
  }>(),
  {
    height: "300px",
    width: "100%",
  },
);

const chartRef = useTemplateRef("chartRef");
let chart: echarts.ECharts | null = null;

const renderChart = () => {
  if (!chartRef.value) return;

  if (!chart) {
    chart = echarts.init(chartRef.value);
  }

  chart.setOption(props.options, true);
  chart.resize();
};

watch(
  () => props.options,
  () => {
    nextTick(() => renderChart());
  },
  { deep: true },
);

useChartResize(chart);

onMounted(() => {
  nextTick(() => {
    renderChart();
  });
});
</script>
<style scoped>
.chart {
  width: 100%;
  min-height: 300px;
}
</style>
