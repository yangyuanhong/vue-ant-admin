<template />
<script lang="ts" setup name="AuthRedirect">
import { onMounted } from 'vue';

onMounted(() => {
  const hash = window.location.search.slice(1);
  const localStorage = window.localStorage;
  if (hash&&localStorage) {
    localStorage.setItem("x-admin-oauth-code", hash)
    window.close();
  }
})
</script>