<template>
  <a-layout style="min-height: 100vh">
    <a-layout-header
      style="color: #fff; display: flex; justify-content: space-between"
    >
      <span>刷题系统</span>
      <a-button size="small" @click="logout">退出</a-button>
    </a-layout-header>
    <a-layout-content style="padding: 24px">
      <a-card title="已登录">
        <p>下一步可以从题目列表开始做。</p>
        <a-space>
          <a-button type="primary" @click="router.push('/router-demo/query')">
            查看 Vue Router 传参示例
          </a-button>
          <a-button @click="router.push('/v-model-demo')">
            查看V-model问题示列
          </a-button>
        </a-space>
      </a-card>
    </a-layout-content>
  </a-layout>
</template>

<script setup lang="ts">
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";

const router = useRouter();
const auth = useAuthStore();

const logout = () => {
  auth.logout();
  router.push("/login");
};
</script>
