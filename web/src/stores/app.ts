import { defineStore } from 'pinia'
import Cookies from "js-cookie"

export type Device = 'mobile' | 'desktop'

export const useAppStore = defineStore('app', {
  state: () => ({
    device: 'desktop' as Device,
    sidebar: {
      opened: Cookies.get('sidebarStatus') ? !!+(Cookies.get('sidebarStatus') as unknown as boolean) : true,
      withoutAnimation: false
    },
    size: Cookies.get("size")||"medium"
  }),
  actions: {
    toggleDevice(device: Device) {
      this.device = device
    },
    closeSideBar(withoutAnimation:boolean) {
      Cookies.set("sidebarStatus", "0");
      this.sidebar.opened = false;
      this.sidebar.withoutAnimation = withoutAnimation
    },
    toggleSideBar() {
      this.sidebar.opened = !this.sidebar.opened;
      this.sidebar.withoutAnimation = false;
      if (this.sidebar.opened) {
        Cookies.set("sidebarStatus", "1");
      } else { 
        Cookies.set("sidebarStatus", "0");
      }
    },
    setSize(size: "medium" | "default" | "small" | "mini") { 
      this.size = size;
      Cookies.set("size", size);
    }
  }
})