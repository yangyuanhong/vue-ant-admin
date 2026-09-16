<template>
  <div
    ref="container"
    id="tags-view-container"
    class="tags-view-container"
  >
  <scroll-pane ref="scrollPane" class="tags-view-wrapper" @scroll="handleScroll">
    <router-link
        v-for="tag in visitedViews"
        ref="tag"
        :key="tag.path"
        :class="isActive(tag)?'active':''"
        :to="{ path: tag.path, query: tag.query }"
        class="tags-view-item"
        @click.middle="!isAffix(tag) ? closeSelectedTag(tag) : undefined"
        @contextmenu.prevent="openMenu(tag, $event)"
      >
        {{ tag.title||tag.meta.title }}
        <CloseOutlined  v-if="!isAffix(tag)" class="tags-view-close"  @click.prevent.stop="closeSelectedTag(tag)" />
      </router-link>
  </scroll-pane>
   <ul v-if="visible && selectedTag" :style="{left:left+'px',top:top+'px'}" class="contextmenu">
      <li @click="refreshSelectedTag(selectedTag)">Refresh</li>
      <li v-if="!isAffix(selectedTag)" @click="closeSelectedTag(selectedTag)">Close</li>
      <li @click="closeOthersTags">Close Others</li>
      <li @click="closeAllTags(selectedTag)">Close All</li>
    </ul>
  </div>
</template>
<script lang="ts" setup name="Index">
import {
  computed,
  nextTick,
  onMounted,
  reactive,
  ref,
  useTemplateRef,
  watch
} from "vue";
import ScrollPane from "./ScrollPane.vue";
import { useTagsViewStore } from "@/stores/tagsView";
import { usePermissionStore } from "@/stores/permission";
import { useRoute, useRouter } from "vue-router";
import { ViewTags } from "@/stores/types/index";
import { CloseOutlined } from "@ant-design/icons-vue"
type ScrollPaneInstance = InstanceType<typeof ScrollPane>;

let visible = ref<boolean>(false);
let top = ref(0);
let left = ref(0);
const selectedTag = ref<ViewTags | null>(null);
let affixTags = reactive<ViewTags[]>([]);
const useTagsView = useTagsViewStore();
const usePermission = usePermissionStore();
const route = useRoute();
const router = useRouter();

const visitedViews = computed(() => useTagsView.visitedViews);
const routes = computed(() => usePermission.routes);

// 必须在 setup 同步阶段调用，内部依赖 getCurrentInstance()
const tagRefs = useTemplateRef<any[]>("tag");
const scrollPane = useTemplateRef<ScrollPaneInstance>("scrollPane");
const container = useTemplateRef<HTMLElement>("container");

const addTags = () => {
  const { name } = route;
  if (!name || typeof name !== "string") return;

  useTagsView.addView(route as unknown as ViewTags);
};
const moveToCurrentTag = () => {
  nextTick(() => {
    // router-link 由 visitedViews 循环渲染，两者下标一一对应，
    // 所以直接用 view 的数据做比较，不必把 fullPath 塞进 :to
    visitedViews.value.some((view, index) => {
      if (view.path !== route.path) return false;

      const tagInstance = tagRefs.value?.[index];
      if (tagInstance) {
        scrollPane.value?.moveToTarget(tagInstance);
      }
      // when query is different then update
      if (view.fullPath !== route.fullPath) {
        useTagsView.updateVisitedView(route as unknown as ViewTags);
      }
      return true;
    });
  });
};

const toLastView = (list: ViewTags[], view: ViewTags) => {
  const visitedViews = useTagsView.visitedViews;
  const latestView = visitedViews.slice(-1)[0];
  if (latestView) {
    router.push(latestView.fullPath);
  } else {
    // now the default is to redirect to the home page if there is no tags-view,
    // you can adjust it according to your needs.
    if (view.name === "Dashboard") {
      // to reload home page
      router.replace({ path: "/redirect" + view.fullPath });
    } else {
      router.push("/");
    }
  }
};

const openMenu = (tag: ViewTags, e: MouseEvent) => {
  const containerElement = container.value;
  if (!containerElement) return;

  const menuMinWidth = 105;
  const offsetLeft = containerElement.getBoundingClientRect().left; // container margin left
  const offsetWidth = containerElement.offsetWidth; // container width
  const maxLeft = offsetWidth - menuMinWidth; // left boundary
  const menuLeft = e.clientX - offsetLeft + 15; // 15: margin right

  if (menuLeft > maxLeft) {
    left.value = maxLeft;
  } else {
    left.value = menuLeft;
  }

  top.value = e.clientY;
  visible.value = true;
  selectedTag.value = tag;
};

const closeMenu = () => {
  visible.value = false;
};
const handleScroll = () => {
  closeMenu();
};

const refreshSelectedTag = (view: ViewTags) => {
  useTagsView.delCachedView(view);
  const { fullPath } = view;
  nextTick(() => {
    router.replace({
      path: "/redirect" + fullPath,
    });
  });
};
const closeSelectedTag = (view: ViewTags) => {
  useTagsView.delView(view);
  if (isActive(view)) {
    toLastView(useTagsView.visitedViews, view);
  }
};

const closeOthersTags = () => {
  const tag = selectedTag.value;
  if (!tag) return;

  router.push(tag.fullPath);
  useTagsView.delOthersViews(tag);
  moveToCurrentTag();
};

const closeAllTags = (view: ViewTags) => {
  useTagsView.delAllViews();
  if (affixTags.some((tag) => tag.path === view.path)) {
    return;
  }
  toLastView(useTagsView.visitedViews, view);
};

const initTags = () => {
  const affixTagsIn: ViewTags[] = (affixTags = filterAffixTags(
    routes.value as ViewTags[],
  ));
  for (const tag of affixTagsIn) {
    if (tag.name) {
      useTagsView.addVisitedView(tag);
    }
  }
};

const isActive = (routeIn: { path: string }) => {
  return routeIn.path === route.path;
};
const isAffix = (tag: ViewTags) => {
  return tag.meta && tag.meta.affix;
};
const filterAffixTags = (routesIn: ViewTags[], basePath = "/") => {
  let tags: ViewTags[] = [];
  routesIn.forEach((routeIn) => {
    if (routeIn.meta && routeIn.meta.affix) {
      const tagPath = `${basePath}/${routeIn.path}`
        .replace(/\\+/g, "/")
        .replace(/\/+/g, "/");
      tags.push({
        fullPath: tagPath,
        path: tagPath,
        name: routeIn.name,
        meta: { ...routeIn.meta },
      });
    }
    if (routeIn.children) {
      const tempTags = filterAffixTags(routeIn.children, routeIn.path);
      if (tempTags.length >= 1) {
        tags = [...tags, ...tempTags];
      }
    }
  });

  return tags;
};

watch(route, () => {
  addTags();
  moveToCurrentTag();
});

watch(visible, (value: boolean) => {
  if (value) {
    document.body.addEventListener("click", closeMenu);
  } else {
    document.body.removeEventListener("click", closeMenu);
  }
});

onMounted(() => {
  initTags();
  addTags();
});
</script>
<style lang="scss" scoped>
.tags-view-container {
  height: 34px;
  width: 100%;
  background: #fff;
  border-bottom: 1px solid #d8dce5;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, .12), 0 0 3px 0 rgba(0, 0, 0, .04);
  .tags-view-wrapper {
    .tags-view-item {
      display: inline-block;
      position: relative;
      cursor: pointer;
      height: 26px;
      line-height: 26px;
      border: 1px solid #d8dce5;
      color: #495060;
      background: #fff;
      padding: 0 8px;
      font-size: 12px;
      margin-left: 5px;
      margin-top: 4px;
      &:first-of-type {
        margin-left: 15px;
      }
      &:last-of-type {
        margin-right: 15px;
      }
      &.active {
        background-color: #42b983;
        color: #fff;
        border-color: #42b983;
        &::before {
          content: '';
          background: #fff;
          display: inline-block;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          position: relative;
          margin-right: 2px;
        }
      }
    }
  }
  .contextmenu {
    margin: 0;
    background: #fff;
    z-index: 3000;
    position: absolute;
    list-style-type: none;
    padding: 5px 0;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 400;
    color: #333;
    box-shadow: 2px 2px 3px 0 rgba(0, 0, 0, .3);
    li {
      margin: 0;
      padding: 7px 16px;
      cursor: pointer;
      &:hover {
        background: #eee;
      }
    }
  }
}
</style>

<style lang="scss">
//reset element css of el-icon-close
.tags-view-wrapper {
  .tags-view-item {
    .tags-view-close {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      text-align: center;
      transition: all .3s cubic-bezier(.645, .045, .355, 1);
      transform-origin: 100% 50%;
      font-size: 10px;
      display: inline-flex;
      justify-content: center;
      align-items: center;

      &:hover {
        background-color: #b4bccc;
        color: #fff;
      }
    }
  }
}
</style>
