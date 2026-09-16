import { defineStore } from "pinia";
import { ViewTags, ViewTagsResult } from "./types";

export const useTagsViewStore = defineStore("tagsView", {
  state: function (): ViewTagsResult {
    return {
      visitedViews: [],
      cachedViews: [],
    };
  },
  actions: {
    addView(view: ViewTags) {
      this.addVisitedView(view);
      this.addCachedView(view);
    },
    addVisitedView(view: ViewTags) {
      if (this.visitedViews.some((v) => v.path === view.path)) return;
      this.visitedViews.push(
        Object.assign({}, view, {
          title: view.meta.title || "no-name",
        }),
      );
    },
    addCachedView(view: ViewTags) {
      if (this.cachedViews.includes(view.name)) return;
      if (!view.meta.noCache) {
        this.cachedViews.push(view.name);
      }
    },

    delView(view: ViewTags) {
      this.delVisitedView(view);
      this.delCachedView(view);
    },
    delVisitedView(view: ViewTags) {
      const visitedViews = [...this.visitedViews];
      for (const [i, v] of visitedViews.entries()) {
        if (v.path === view.path) {
          visitedViews.splice(i, 1);
          break;
        }
      }
      this.visitedViews = visitedViews;
    },
    delCachedView(view: ViewTags) {
      const cachedViews = [...this.cachedViews];
      const index = cachedViews.indexOf(view.name);
      index > -1 && cachedViews.splice(index, 1);
      this.cachedViews = cachedViews;
    },

    delOthersViews(view: ViewTags) {
      this.delOthersVisitedViews(view);
      this.delOthersCachedViews(view);
    },

    delOthersVisitedViews(view: ViewTags) {
      this.visitedViews = this.visitedViews.filter((v) => {
        return v.meta.affix || v.path === view.path;
      });
    },
    delOthersCachedViews(view: ViewTags) {
      const index = this.cachedViews.indexOf(view.name);
      if (index > -1) {
        this.cachedViews = this.cachedViews.slice(index, index + 1);
      } else {
        this.cachedViews = [];
      }
    },

    delAllViews() {
      this.delAllVisitedViews();
      this.delAllCachedViews();
    },

    delAllVisitedViews() {
      const affixTags = this.visitedViews.filter((tag) => tag.meta.affix);
      this.visitedViews = affixTags;
    },
    delAllCachedViews() {
      this.cachedViews = [];
    },

    updateVisitedView(view: ViewTags) {
      for (let v of this.visitedViews) {
        if (v.path === view.path) {
          v = Object.assign(v, view);
          break;
        }
      }
    },
  },
});
