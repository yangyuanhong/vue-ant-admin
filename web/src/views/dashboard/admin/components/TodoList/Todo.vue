<template>
  <li :class="{ completed: todo.done, editing: editing }" class="todo">
    <div class="view">
      <input
        :checked="todo.done"
        class="toggle"
        type="checkbox"
        @change="toggleTodo( todo)"
      >
      <label @dblclick="editing = true" v-text="todo.text" />
      <button class="destroy" @click="deleteTodo( todo )" />
    </div>
    <input
      v-show="editing"
      v-focus="editing"
      :value="todo.text"
      class="edit"
      @keyup.enter="doneEdit"
      @keyup.esc="cancelEdit"
      @blur="doneEdit"
    >
  </li>
</template>
<script lang="ts" setup name="Todo">
import { ref, nextTick } from "vue";
import { TodoData } from "../../types";
import type { Directive } from "vue";

const vFocus: Directive = {
  mounted(el, { value }) {
    if (value) {
      nextTick(() => {
        el.focus();
      })
    }
  },
  updated(el, { value }) {
    if (value) {
      nextTick(() => {
        el.focus();
      })
    }
  }
}

let editing = ref<boolean>(false);
const props = withDefaults(
  defineProps<{
    todo?: TodoData;
  }>(),
  {
    todo: () => ({text:"",done:false}),
  },
);
const emit = defineEmits(["deleteTodo", "editTodo", "toggleTodo"]);

const deleteTodo = (todo: TodoData|{}) => emit("deleteTodo", todo);
const editTodo = ({ todo, value }: { todo: TodoData; value: string }) => {
  emit("editTodo", { todo, value });
};
const toggleTodo = (todo: TodoData) => {
  emit("toggleTodo", todo)
};

const doneEdit = (e: Event) => {
  const target = e.target as HTMLInputElement;
  const value = target.value.trim();
  if (!value) {
    deleteTodo({todo:props.todo})
  } else if (editing.value) {
    editTodo({
      todo: props.todo,
      value
    })
    editing.value = false;
  }
}

const cancelEdit = (e: Event) => {
  const target = e.target as HTMLInputElement;
  target.value = props.todo.text;
  editing.value = false;
  
}
</script>
<style scoped></style>
