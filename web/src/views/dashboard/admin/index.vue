<template>
  <div class="dashboard-editor-container">
    <github-corner class="github-corner" />
    <panel-group @handleSetLineChartData="handleSetLineChartData" />
    <a-row style="background:#fff;padding:16px 16px 0;margin-bottom:32px;">
      <line-chart :chart-data="lineChartData" />
    </a-row>
    <a-row :gutter="32">
     <a-col :xs="24" :sm="24" :lg="8">
        <div class="chart-wrapper">
          <raddar-chart />
        </div>
      </a-col>
      <a-col :xs="24" :sm="24" :lg="8">
        <div class="chart-wrapper">
          <pie-chart />
        </div>
      </a-col>
      <a-col :xs="24" :sm="24" :lg="8">
        <div class="chart-wrapper">
          <bar-chart />
        </div>
      </a-col>
    </a-row>
    <a-row :gutter="8">
      <a-col :xs="{span: 24}" :sm="{span: 24}" :md="{span: 24}" :lg="{span: 12}" :xl="{span: 12}" style="padding-right:8px;margin-bottom:30px;">
        <transaction-table />
      </a-col>
       <a-col :xs="{span: 24}" :sm="{span: 12}" :md="{span: 12}" :lg="{span: 6}" :xl="{span: 6}" style="margin-bottom:30px;">
        <todo-list />
      </a-col>
      <a-col :xs="{span: 24}" :sm="{span: 12}" :md="{span: 12}" :lg="{span: 6}" :xl="{span: 6}" style="margin-bottom:30px;">
        <box-card />
      </a-col>
    </a-row>
  </div>
</template>
<script lang="ts" setup name="DashboardAdmin">
import { reactive } from "vue";
import GithubCorner from "@/components/GithubCorner/index.vue";
import LineChart from './components/LineChart.vue'
import PanelGroup from "./components/PanelGroup.vue";
import RaddarChart from "./components/RaddarChart.vue"
import { LineChartDataSum } from "./types";
import PieChart from "./components/PieChart.vue"
import BarChart from "./components/BarChart.vue";
import TransactionTable from './components/TransactionTable.vue'
import TodoList from "./components/TodoList/index.vue";
import BoxCard from "./components/BoxCard.vue";

const lineChartDataSum: LineChartDataSum = {
  newVisitis: {
    expectedData: [100, 120, 161, 134, 105, 160, 165],
    actualData: [120, 82, 91, 154, 162, 140, 145],
  },
  messages: {
    expectedData: [200, 192, 120, 144, 160, 130, 140],
    actualData: [180, 160, 151, 106, 145, 150, 130],
  },
  purchases: {
    expectedData: [80, 100, 121, 104, 105, 90, 100],
    actualData: [120, 90, 100, 138, 142, 130, 130],
  },
  shoppings: {
    expectedData: [130, 140, 141, 142, 145, 150, 160],
    actualData: [120, 82, 91, 154, 162, 140, 130],
  },
};
let lineChartData = reactive({...lineChartDataSum.newVisitis});

const handleSetLineChartData = (type: keyof LineChartDataSum) => {
  Object.assign(lineChartData, lineChartDataSum[type]);
};
</script>
<style lang="scss" scoped>
.dashboard-editor-container {
  padding: 32px;
  background-color: rgb(240, 242, 245);
  position: relative;

  .github-corner {
    position: absolute;
    top: 0px;
    border: 0;
    right: 0;
  }

  .chart-wrapper {
    background: #fff;
    padding: 16px 16px 0;
    margin-bottom: 32px;
  }
}

@media (max-width: 1024px) {
  .chart-wrapper {
    padding: 8px;
  }
}
</style>
