import { createApp } from "vue";
import { createPinia } from "pinia";
import 'normalize.css/normalize.css' // a modern alternative to CSS resets

import Antd from "ant-design-vue";
import "ant-design-vue/dist/reset.css";
import '@/styles/index.scss' 
import "./styles.css";
import App from "./App.vue";
import router from "./router";
import { SvgIcon } from "./icons";
import './permission' // permission control
import { registerDirectives } from "./directive";

import { setupErrorHandler } from './stores/errorLog'

const pinia = createPinia();
const app = createApp(App).use(pinia).use(router).use(Antd);
setupErrorHandler(app, pinia)
registerDirectives(app);


app.component("SvgIcon", SvgIcon);

app.mount("#app");
