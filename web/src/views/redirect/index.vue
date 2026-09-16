<script lang="ts" setup name="RedirectIndex">
import { onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
const route = useRoute();
const router = useRouter();

const { params, query } = route;
const { path } = params;


onMounted(() => {
  router.replace({
  path: "/" + path,
  query,
});
})
</script>
