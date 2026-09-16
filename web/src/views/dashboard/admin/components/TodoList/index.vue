<template>
  <section class="todoapp">
    <!-- header -->
    <header class="header">
      <input
        class="new-todo"
        autocomplete="off"
        placeholder="Todo List"
        @keyup.enter="addTodo"
      />
    </header>
    <!-- main section -->
    <section v-show="todos.length" class="main">
      <input
        id="toggle-all"
        :checked="allChecked"
        class="toggle-all"
        type="checkbox"
        @change="toggleAll({ done: !allChecked })"
      />
      <label for="toggle-all" />
      <ul class="todo-list">
        <todo
          v-for="(todo, index) in filteredTodos"
          :key="index"
          :todo="todo"
          @toggleTodo="toggleTodo"
          @editTodo="editTodo"
          @deleteTodo="deleteTodo"
        />
      </ul>
    </section>
    <!-- footer -->
    <footer v-show="todos.length" class="footer">
      <span class="todo-count">
        <strong>{{ remaining }}</strong>
        {{ pluralize(remaining, "item") }} left
      </span>
      <ul class="filters">
        <li v-for="(val, key) in filters" :key="key">
          <a
            :class="{ selected: visibility === key }"
            @click.prevent="visibility = key"
            >{{ capitalize(key) }}</a
          >
        </li>
      </ul>
      <!-- <button class="clear-completed" v-show="todos.length > remaining" @click="clearCompleted">
        Clear completed
      </button> -->
    </footer>
  </section>
</template>
<script lang="ts" setup name="Index">
import Todo from "./Todo.vue";
import { FilterTodo, TodoData } from "../../types/index";
import { computed, reactive, ref } from "vue";

const STORAGE_KEY = "todos";
const filters: FilterTodo = {
  all: (todos: TodoData[]) => todos,
  active: (todos: TodoData[]) => todos.filter((todo) => !todo.done),
  completed: (todos: TodoData[]) => todos.filter((todo) => todo.done),
};
const defalutList = [
  { text: "star this repository", done: false },
  { text: "fork this repository", done: false },
  { text: "follow author", done: false },
  { text: "vue-element-admin", done: true },
  { text: "vue", done: true },
  { text: "element-ui", done: true },
  { text: "axios", done: true },
  { text: "webpack", done: true },
];

const pluralize = (n: number, w: string) => (n === 1 ? w : w + "s");
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

let visibility = ref<keyof FilterTodo>("all");
let todos = reactive<TodoData[]>([...defalutList]);

const allChecked = computed(() => todos.every((todo) => todo.done));

const filteredTodos = computed(() => {
  return filters[visibility.value](todos);
});
const remaining = computed(() => todos.filter((todo) => !todo.done).length);

const setLocalStorage = () => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
};

const addTodo = (e: Event) => {
  const target = e.target as HTMLInputElement;
  const text = target.value;
  if (text.trim()) {
    todos.push({
      text,
      done: false,
    });
    setLocalStorage();
  }
};
const toggleTodo = (val: TodoData) => {
  val.done = !val.done;
  setLocalStorage();
};

const deleteTodo = (todo: TodoData) => {
  todos.splice(todos.indexOf(todo), 1);
};

const editTodo = ({ todo, value }: { todo: TodoData; value: string }) => {
  todo.text = value;
  setLocalStorage();
};

const clearCompleted = () => {
  todos = todos.filter((todo) => !todo.done);
  setLocalStorage();
};

const toggleAll = ({ done }: {done:boolean}) => {
  todos.forEach((todo) => {
    todo.done = done;
    setLocalStorage();
  });
};
</script>
<style lang="scss">
@use "./index.scss";
</style>
