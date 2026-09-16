<template>
  <div class="TransactionTable">
    <a-table
      border
      :data-source="list"
      :columns="columns"
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
            <a-tag :type="statusFilter(record.status)">
              {{  record.status }}
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
const statusFilter = (status: keyof { success: string; padding: string }) => {
  const statusMap = { success: "success", padding: "danger" };
  return statusMap[status];
};
const orderNoFilter = (str: string) => str.substring(0, 30);

const fetchData = async () => {
  const response = await transactionList();
  if (response.data) {
    list.value = response.data.items.splice(0, 8);
  }
};

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
