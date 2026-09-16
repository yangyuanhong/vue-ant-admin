import { defineStore } from "pinia";
import settings from '@/settings'

export interface ErrorLogEntry {
  err: unknown;
  info?: string;
  url: string;
}

export const errorLogStore = defineStore("errorlog", {
  state: ():{logs: ErrorLogEntry[]} => ({
    logs: [],
  }),
  actions: {
    addErrorLog(log: ErrorLogEntry) {
      this.logs.push(log)
    },
    clearErrorLog() { 
      this.logs.splice(0);
    }
  }
});


export function setupErrorHandler(app: import('vue').App, pinia: import('pinia').Pinia) {
  const enabled = import.meta.env.MODE === settings.errorLog;

  if (!enabled) return;
  app.config.errorHandler = (err, _instance, info) => {
    errorLogStore(pinia).addErrorLog({ err, info, url: window.location.href })
    console.error(err, info)
  }
}
