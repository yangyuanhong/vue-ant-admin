import { defineStore } from "pinia";
import defaultSettings from "@/settings"
import { BooleanSettingKey } from '@/stores/types'

const STORAGE_KEY = "app-theme-color";
const DEFAULT_PRIMARY_COLOR = "#1890ff";
const { showSettings, tagsView, fixedHeader, sidebarLogo } = defaultSettings;


function applyCssVariables(PrimaryColor: string) {
  document.documentElement.style.setProperty(
    "--app-primary-color",
    PrimaryColor,
  );
}

export const useSettingsStore = defineStore("settings", {
  state: () => ({ 
    primaryColor: localStorage.getItem(STORAGE_KEY) || DEFAULT_PRIMARY_COLOR,
    showSettings,
    tagsView,
    fixedHeader,
    sidebarLogo
  }),
  actions: {
    initialize() { 
      applyCssVariables(this.primaryColor)
    },
    setPrimaryColor(color: string) { 
      this.primaryColor = color;
      localStorage.setItem(STORAGE_KEY, color);
      applyCssVariables(color)
    },
    changeSetting(data: { key: BooleanSettingKey; value: boolean }) {
      this[data.key] = data.value
    }
  }
});
