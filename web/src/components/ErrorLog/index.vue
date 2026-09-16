<template>
  <div v-if="errorLogs.length > 0">
    <a-badge
      dot
      style="line-height: 25px; margin-top: -5px"
      @click.native="dialogTableVisible = true"
    >
      <a-button style="padding: 8px 10px" size="small" type="danger">
        <SvgIcon icon-class="bug" />
      </a-button>
    </a-badge>
    <a-modal v-model:open="dialogTableVisible" width="80%">
      <div slot="title">
        <span style="padding-right: 10px">Error Log</span>
        <a-button
          size="mini"
          type="danger"
          :icon="h(DeleteOutlined)"
          @click="clearAll"
          >Clear All</a-button
        >
      </div>

      <a-table :data="errorLogs" border :columns="columns">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'msg'">
            <div>
              <span class="message-title">Msg:</span>
              <a-tag type="danger">
                {{ record.err.message }}
              </a-tag>
            </div>
            <br />
            <div>
              <span class="message-title" style="padding-right: 10px"
                >Info:
              </span>
              <a-tag type="warning">
                {{ record.vm.$vnode.tag }} error in {{ record.info }}
              </a-tag>
            </div>
            <br />
            <div>
              <span class="message-title" style="padding-right: 16px"
                >Url:
              </span>
              <a-tag type="success">
                {{ record.url }}
              </a-tag>
            </div>
          </template>
          <template v-else-if="column.key === 'stack'">
            {{ record.err.stack }}
          </template>
        </template>
      </a-table>
    </a-modal>
  </div>
</template>
<script lang="ts" setup name="ErrorLog">
import { errorLogStore } from "@/stores/errorLog";
import { computed, h, ref } from "vue";
import { DeleteOutlined } from "@ant-design/icons-vue";

let dialogTableVisible = ref<boolean>(false);
const errorlog = errorLogStore();

let errorLogs = computed(() => errorlog.logs);

const columns = [
  {
    title: "Message",
    dataIndex: "msg",
    key: "msg",
  },
  {
    title: "Stack",
    dataIndex: "stack",
    key: "stack",
  },
];

const clearAll = () => {
  dialogTableVisible.value = false;
  errorlog.clearErrorLog();
};
</script>
<style scoped></style>
