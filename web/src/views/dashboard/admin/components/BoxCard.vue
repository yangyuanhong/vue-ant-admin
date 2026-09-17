<template>
  <a-card class="box-card-component" style="margin-left:8px;">
    <div slot="header" class="box-card-header">
      <img src="https://wpimg.wallstcn.com/e7d23d71-cf19-4b90-a1cc-f56af8c0903d.png">
    </div>
    <div style="position:relative;">
      <pan-thumb :image="avatar" class="panThumb" />
      <mallki class-name="mallki-text" text="vue-ant-admin" />
      <div style="padding-top:35px;" class="progress-item">
        <span>Vue</span>
        <a-progress :percent="70" />
      </div>
      <div class="progress-item">
        <span>JavaScript</span>
        <a-progress :percent="18" />
      </div>
      <div class="progress-item">
        <span>CSS</span>
        <a-progress :percent="12" />
      </div>
      <div class="progress-item">
        <span>ESLint</span>
        <a-progress :percent="100" status="success" />
      </div>
    </div>
  </a-card>
</template>
<script lang="ts" setup name="BoxCard">
import PanThumb from '@/components/PanThumb/index.vue'
import Mallki from '@/components/TextHoverEffect/Mallki.vue';
import { Status } from '../types';
import { computed, reactive } from 'vue';
import { useAuthStore } from '@/stores/auth';

const useAuth = useAuthStore();
const statusFilter = (status: keyof Status) => {
  const statusMap = {
    success: "success",
    pending: "danger"
  }
  return statusMap[status]
}

let statisticsData = reactive({
  article_count: 1024,
  pageviews_count: 1024
});

const name = computed(() => useAuth.name);
const avatar = computed(()=>useAuth.avatar)
const roles = computed(()=>useAuth.roles)

</script>
<style lang="scss" >
.box-card-component{
  .el-card__header {
    padding: 0px!important;
  }
}
</style>
<style lang="scss" scoped>
.box-card-component {
  .box-card-header {
    position: relative;
    height: 220px;
    img {
      width: 100%;
      height: 100%;
      transition: all 0.2s linear;
      &:hover {
        transform: scale(1.1, 1.1);
        filter: contrast(130%);
      }
    }
  }
  .mallki-text {
    position: absolute;
    top: 0px;
    right: 0px;
    font-size: 20px;
    font-weight: bold;
  }
  .panThumb {
    z-index: 100;
    height: 70px!important;
    width: 70px!important;
    position: absolute!important;
    top: -45px;
    left: 0px;
    border: 5px solid #ffffff;
    background-color: #fff;
    margin: auto;
    box-shadow: none!important;
    :deep(.pan-info) {
      box-shadow: none!important;
    }
  }
  .progress-item {
    margin-bottom: 10px;
    font-size: 14px;
  }
  @media only screen and (max-width: 1510px){
    .mallki-text{
      display: none;
    }
  }
}
</style>