import type { RouteRecordRaw, RouteMeta } from "vue-router";

export interface DefaultSettings {
  title: "Vue Element Admin";

  /**
   * @type {boolean} true | false
   * @description Whether show the settings right-panel
   */
  showSettings: boolean;

  /**
   * @type {boolean} true | false
   * @description Whether need tagsView
   */
  tagsView: boolean;

  /**
   * @type {boolean} true | false
   * @description Whether fix the header
   */
  fixedHeader: boolean;

  /**
   * @type {boolean} true | false
   * @description Whether show the logo in sidebar
   */
  sidebarLogo: boolean;

  /**
   * @type {string | array} 'production' | ['production', 'development']
   * @description Need show err logs component.
   * The default is only used in the production env
   * If you want to also use it in dev, you can pass ['production', 'development']
   */
  errorLog: string | string[];
}

export type BooleanSettingKey =
  | "showSettings"
  | "tagsView"
  | "fixedHeader"
  | "sidebarLogo";

export type BooleanSetting = Pick<DefaultSettings, BooleanSettingKey>;



// 扩展路由记录类型
export declare type ExtendedRouteRecordRaw = RouteRecordRaw & {
  // 菜单高亮的key
  activeMenu?: string; // 是否在菜单中隐藏
  hidden?: boolean; // 路由元信息
  alwaysShow?: boolean;
  noShowingChildren?: boolean;
  meta?: RouteMeta & {
    // 标题
    title?: string; // 图标
    hidden?: boolean; // 路由元信息
    icon?: string; // 权限列表
    roles?: string[]; // 是否需要缓存
    keepAlive?: boolean; // 是否需要登录
    requiresAuth?: boolean; // 额外参数
    params?: Record<string, any>;
  };
};
