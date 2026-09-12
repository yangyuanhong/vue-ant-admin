# Vue 3 技术栈学习项目

这是一个以学习 Vue 3 及其周边技术为目标的前后端分离项目。前端基于 [vue-element-admin](https://github.com/PanJiaChen/vue-element-admin/) 的设计思路进行重构，将 Vue 2 写法逐步迁移为 Vue 3、Vite、TypeScript 和 Composition API 写法；后端提供简单的 Express + MongoDB 登录接口。

> 本项目主要用于个人学习、源码阅读和技术实践，不是 `vue-element-admin` 官方项目的直接分支。

## 技术栈

### 前端（`web`）

- Vue 3：组件化开发与 Composition API
- Vite：开发服务器和生产构建
- TypeScript：类型约束与开发体验
- Vue Router 4：路由管理、嵌套路由与路由参数
- Pinia：应用状态管理
- Ant Design Vue：通用 UI 组件
- Element Plus：消息提示等辅助组件
- Sass：样式组织与变量管理
- Axios：HTTP 请求封装
- `screenfull`：全屏能力
- `vite-plugin-svg-icons`：SVG 图标管理

### 后端（`api`）

- Node.js + Express：HTTP 服务
- MongoDB + Mongoose：数据持久化
- JSON Web Token：登录认证
- bcryptjs：密码哈希
- dotenv：环境变量管理

## 项目结构

```text
apps/
├─ web/                    # Vue 3 前端
│  ├─ src/
│  │  ├─ api/              # 接口请求
│  │  ├─ components/       # 通用组件
│  │  ├─ layout/           # 页面布局、侧边栏、导航栏
│  │  ├─ router/            # 路由配置
│  │  ├─ stores/            # Pinia 状态
│  │  ├─ styles/            # 全局样式与主题变量
│  │  └─ views/             # 页面视图与学习示例
│  └─ vite.config.ts
├─ api/                    # Express 后端
│  └─ src/
│     ├─ config/            # 数据库配置
│     ├─ middleware/        # 中间件
│     ├─ models/            # Mongoose 模型
│     ├─ routes/            # API 路由
│     └─ server.js
└─ README.md
```

## 环境要求

- Node.js 18+
- npm 9+
- MongoDB 6+（本地或远程实例）

## 安装

在项目根目录执行：

```bash
cd web
npm install

cd ../api
npm install
```

## 配置环境变量

在 `api` 目录创建 `.env` 文件：

```env
PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/vue-admin-learning
JWT_SECRET=please-change-this-secret
```

请勿将包含真实密钥、数据库密码或生产配置的 `.env` 文件提交到 Git。

## 启动项目

分别打开两个终端：

```bash
# 终端 1：启动后端
cd api
npm run dev
```

```bash
# 终端 2：启动前端
cd web
npm run dev
```

前端默认地址：<http://localhost:5173>  
后端默认端口：`3000`

生产构建与预览：

```bash
cd web
npm run build
npm run preview
```

## 学习内容

当前代码重点覆盖：

- Vue 3 `<script setup>`、`ref`、`computed`、生命周期和自定义指令
- TypeScript 在 Vue 组件、路由和 Pinia 中的类型定义
- Vue Router 4 的嵌套路由、动态参数、重定向和路由守卫
- Pinia 状态拆分与持久化思路
- Vue 2 到 Vue 3 的组件、事件和模板语法迁移
- Vite 别名、SVG 图标和 Sass 工程化配置
- Express 登录接口、JWT 认证和 MongoDB 数据模型

## Git 提交规范

提交信息建议遵循 Conventional Commits：

```text
<type>(<scope>): <description>
```

常用类型：

- `feat`：新增功能
- `fix`：修复问题
- `refactor`：重构，不改变外部行为
- `docs`：文档变更
- `style`：格式或样式调整
- `test`：测试相关
- `chore`：构建、依赖或工具变更

示例：

```text
feat(web): add router params demo
fix(api): handle invalid login credentials
docs: update local development guide
```

建议使用小而清晰的提交，每次提交只完成一个逻辑变更；提交前至少执行前端类型检查和生产构建。

## 参考项目

- [vue-element-admin](https://github.com/PanJiaChen/vue-element-admin/)：后台管理系统实践参考
- [Vue.js](https://vuejs.org/)
- [Vite](https://vitejs.dev/)
- [Pinia](https://pinia.vuejs.org/)
- [Vue Router](https://router.vuejs.org/)

## 免责声明

本项目仅用于学习和技术验证。代码、目录结构和交互设计参考了开源项目，但已根据 Vue 3 学习目标进行调整和重构。使用时请遵守相关开源项目的许可证要求。
