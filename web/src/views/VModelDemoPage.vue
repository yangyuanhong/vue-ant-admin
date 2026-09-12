<template>
  <input v-focus="'red'" placeholder="页面加载后自动获取焦点">
</template>

<script setup lang="ts">
const vFocus = {
  mounted(element: HTMLInputElement, binding: { value: string }) {
    element.focus()
    element.style.borderColor = binding.value
  }
}
</script>
