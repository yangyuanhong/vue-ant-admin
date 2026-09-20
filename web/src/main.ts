import { createApp } from "vue";
import { createPinia } from "pinia";
import 'normalize.css/normalize.css' // a modern alternative to CSS resets

import "ant-design-vue/dist/reset.css";
import '@/styles/index.scss' 
import "./styles.css";
import App from "./App.vue";
import router from "./router";
// 引入聊天室组件
import { AdvancedChatPlugin } from "@advanced-chat/components";
import "@advanced-chat/components/styles"

import { SvgIcon } from "./icons";
import './permission' // permission control
import { registerDirectives } from "./directive";

import { setupErrorHandler } from './stores/errorLog'

const pinia = createPinia();
const app = createApp(App).use(pinia).use(router).use(
  AdvancedChatPlugin({
    strings: {
      "chats.empty": "暂无聊天室",
      "chats.search.placeholder": "搜索聊天室",
      "chat.empty": "暂无聊天",
      "chat.messages.empty": "还没有消息",
      "chat.messages.new": "新消息",
      "chat.message.placeholder": "输入消息",
      "chat.message.deleted": "消息已删除",
      "chat.message.failure": "消息发送失败",
      "chat.typing": "正在输入...",
      "chat.cancel-selection": "取消选择",
      "chat.cancel-reply": "取消回复",
      "chat.cancel-edit": "取消编辑",
      "chat.scroll-to-bottom": "滚动到底部",
      "chat.user.is-online": "在线",
      "chat.user.last-seen": "最后在线于",
      "chat.autocomplete.emojis": "表情",
      "chat.autocomplete.users": "用户",
      "chat.state.loading": "加载中...",
      "chat.state.empty": "暂无内容",
      "chat.state.error": "加载失败",
      "chat.state.offline": "离线",
      "chat.state.reconnecting": "重新连接中...",
      "chat.state.permission-denied": "没有权限",
      "chat.state.retry": "重试",
    },
  })
);
setupErrorHandler(app, pinia)
registerDirectives(app);


app.component("SvgIcon", SvgIcon);

app.mount("#app");
