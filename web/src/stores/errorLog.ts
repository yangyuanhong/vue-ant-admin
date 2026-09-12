import { defineStore } from "pinia";

export const errorLogStore = defineStore("errorlog", {
  state: ():{logs:string[]} => ({
    logs: [],
  }),
  actions: {
    addErrorLog(log: string) { 
      this.logs.push(log)
    },
    clearErrorLog() { 
      this.logs.splice(0);
    }
  }
});
