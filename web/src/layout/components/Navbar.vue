<template>
  <div class="navbar">
    <hamburger
      id="hamburger-container"
      :is-active="sidebar.opened"
      class="hamburger-container"
      @toggleClick="toggleSideBar"
    />
    <breadcrumb id="breadcrumb-container" class="breadcrumb-container" />
    <template v-if="device !== 'mobile'">
      <error-log class="errLog-container right-menu-item hover-effect" />
    </template>
    <div class="right-menu">
      <error-log class="errLog-container right-menu-item hover-effect" />
      <screen-full id="screenfull" class="right-menu-item hover-effect" />
      <a-dropdown
        class="avatar-container right-menu-item hover-effect"
        trigger="click"
      >
        <div>
          <div class="avatar-wrapper">
            <img
              :src="avatar + '?imageView2/1/w/80/h/80'"
              class="user-avatar"
            />
            <CaretDownOutlined class="a-icon-caret-bottom" />
          </div>
        </div>
        <template #overlay>
          <a-menu>
            <a-menu-item>
              <router-link to="/"> Dashboard </router-link>
            </a-menu-item>
            <a-menu-divider />
            <a-menu-item divided @click.native="logout">
              <span style="display: block">Log Out</span>
            </a-menu-item>
          </a-menu>
        </template>
      </a-dropdown>
    </div>
  </div>
</template>
<script lang="ts" setup name="Navbar">
import { computed } from "vue";
import Breadcrumb from "@/components/Breadcrumb/index.vue";
import Hamburger from "@/components/Hamburger/index.vue";
import ErrorLog from "@/components/ErrorLog/index.vue";
import ScreenFull from "@/components/ScreenFull/index.vue"
import { CaretDownOutlined } from "@ant-design/icons-vue";
import { useAppStore } from "@/stores/app";
import { useAuthStore } from "@/stores/auth";
import { useRouter, useRoute } from "vue-router";

const useApp = useAppStore();
const auth = useAuthStore();
const router = useRouter();
const route = useRoute();
const sidebar = computed(() => useApp.sidebar);
const device = computed(() => useApp.device);
const avatar = computed(() => auth.avatar);

const toggleSideBar = useApp.toggleSideBar;

const logout = () => {
  auth.logout();
  router.push(`/login?redirect=${route.fullPath}`);
};
</script>
<style lang="scss" scoped>
.navbar {
  height: 50px;
  overflow: hidden;
  position: relative;
  background: #fff;
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.08);

  .hamburger-container {
    line-height: 46px;
    height: 100%;
    float: left;
    cursor: pointer;
    transition: background 0.3s;
    -webkit-tap-highlight-color: transparent;

    &:hover {
      background: rgba(0, 0, 0, 0.025);
    }
  }

  .breadcrumb-container {
    float: left;
  }

  .errLog-container {
    display: inline-block;
    vertical-align: top;
  }

  .right-menu {
    float: right;
    height: 100%;
    line-height: 50px;

    &:focus {
      outline: none;
    }

    .right-menu-item {
      display: inline-block;
      padding: 0 8px;
      height: 100%;
      font-size: 18px;
      color: #5a5e66;
      vertical-align: text-bottom;

      &.hover-effect {
        cursor: pointer;
        transition: background 0.3s;

        &:hover {
          background: rgba(0, 0, 0, 0.025);
        }
      }
    }

    .avatar-container {
      margin-right: 30px;

      .avatar-wrapper {
        position: relative;

        .user-avatar {
          cursor: pointer;
          width: 40px;
          height: 40px;
          border-radius: 10px;
        }

        .a-icon-caret-bottom {
          cursor: pointer;
          position: absolute;
          right: -15px;
          top: 30px;
          font-size: 12px;
        }
      }
    }
  }
}
</style>
