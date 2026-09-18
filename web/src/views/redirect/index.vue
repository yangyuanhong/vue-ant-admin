<template>
  <div aria-hidden="true" />
</template>

<script lang="ts" setup name="RedirectIndex">
import { onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
const route = useRoute();
const router = useRouter();

const { pathMatch } = route.params;
const targetPath = Array.isArray(pathMatch) ? pathMatch.join("/") : pathMatch;

onMounted(() => {
  router.replace({
    path: "/" + (targetPath || ""),
    query: route.query,
  });
});
</script>
