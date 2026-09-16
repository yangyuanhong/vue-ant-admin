import type { App } from "vue";
import { focus } from "./focus";

export function registerDirectives(app: App) {
  app.directive("v-focus", focus);
}

