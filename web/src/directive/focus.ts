import { nextTick } from "vue";
import type { Directive } from "vue";

export const focus: Directive = {
  mounted(el, { value }) {
    if(value)nextTick(()=>el.focus())
  },
  updated(el, { value }) {
    if(value)nextTick(()=>el.focus())
  }
}