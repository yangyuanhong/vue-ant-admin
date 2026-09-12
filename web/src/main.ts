import { createApp } from "vue";
import { createPinia } from "pinia";
import Antd from "ant-design-vue";
import "ant-design-vue/dist/reset.css";
import '@/styles/index.scss' 
import "./styles.css";
import App from "./App.vue";
import router from "./router";
import { SvgIcon } from "./icons";

const app = createApp(App).use(createPinia()).use(router).use(Antd);

app.directive("focus", {
  mounted(element: HTMLInputElement) {
    element.focus();
  },
});

app.component("SvgIcon", SvgIcon);

app.mount("#app");
