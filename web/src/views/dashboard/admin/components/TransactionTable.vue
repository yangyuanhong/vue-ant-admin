<template>
  <div class="TransactionTable">
    <a-table
      border
      :data-source="list"
      :columns="columns"
      v-bind="tableConfig"
      style="width: 100%; padding-top: 15px"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'order_no'">
            {{ orderNoFilter(record.order_no) }}
        </template>
        <template v-else-if="column.key === 'price'">
             ¥{{ toThousandFilter(record.price) }}
        </template>
        <template v-else-if="column.key === 'status'">
            <a-tag :color="statusFilter(record.status)">
              {{  statusText(record.status) }}
            </a-tag>
        </template>
      </template>
    </a-table>
  </div>
</template>
<script lang="ts" setup name="TransactionTable">
import { transactionList } from "@/api/remote-search";
import { computed, onMounted, ref } from "vue";
import { TransactionList } from "../types";
import { toThousandFilter } from "@/utils";

let list = ref<TransactionList[] | null>(null);
const statusFilter = (status: keyof { "1": string; "0": string }) => {
  const statusMap = { "1": "success", "0": "error" };
  return statusMap[status];
};
const statusText = (status: keyof { "0": string, "1": string })=>{
  const statusMap = { "1": "成功", "0": "失败" };
  return statusMap[status];
}
const orderNoFilter = (str: string) => str.substring(0, 30);

const fetchData = async () => {
  const response = await transactionList();
  if (response.data&&response.data.items) {
    list.value = response.data.items.splice(0, 8);
  }
};
let tableConfig = {
  pagination:false
}

const columns = computed(() => {
  return [
    {
      title: "Order_No",
      dataIndex: "order_no",
      key: "order_no",
      minWidth: 200
    },
    {
      title: "Price",
      dataIndex: "price",
      key: "price",
      width: 195
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 100
    },
  ];
});

onMounted(() => {
  fetchData();
});
</script>
<style scoped></style>
