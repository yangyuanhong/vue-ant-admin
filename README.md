# Vue 3 管理后台学习项目

这是一个以学习 Vue 3、Vite、TypeScript 和后台管理系统常见工程能力为目标的前后端分离项目。前端基于 [vue-element-admin](https://github.com/PanJiaChen/vue-element-admin/) 的设计思路进行重构，逐步实现 Vue 3 + Composition API + Pinia 的管理端架构；后端则提供 Express + MongoDB 的登录认证与权限相关接口。

> 本项目主要用于个人学习、源码阅读和技术实践，不是 `vue-element-admin` 官方项目的直接分支。

## 项目定位

当前项目已经从“单纯的 Vue 学习 demo”升级成了一个更贴近真实管理后台的示例，重点覆盖：

- 登录认证与 Token 管理
- 分角色权限控制与动态路由
- 侧边栏 / 顶部导航 / 面包屑 / 标签页布局
- 仪表盘页面与图表展示
- 基于 LangChain 的智能体问答与工具调用
- Socket.IO 流式聊天、会话管理和消息持久化
- 错误页、404/401 页面和全局错误处理
- SVG 图标、页面标题、复制和全屏交互
- 多种 Vue 学习示例页面（路由、v-model、图标、心形特效等）

## 技术栈

### 前端（`web`）

- Vue 3：组件化开发与 Composition API
- Vite：开发服务器和生产构建
- TypeScript：类型约束与开发体验
- Vue Router 4：路由管理、嵌套路由、重定向和权限守卫
- Pinia：应用状态管理（登录态、权限、标签页等）
- Ant Design Vue：后台管理系统 UI 组件
- Element Plus：消息提示等辅助能力
- ECharts：图表与数据可视化
- Sass：样式组织与主题变量管理
- Axios：HTTP 请求封装
- `js-cookie`、`nprogress`、`screenfull`：登录态缓存、顶部进度条和全屏能力
- `vite-plugin-svg-icons`：SVG 图标管理
- `normalize.css`：基础样式重置
- `@advanced-chat/components`：聊天界面组件
- `socket.io-client`：实时聊天连接

### 后端（`api`）

- Node.js + Express：HTTP 服务
- TypeScript：服务端类型约束
- MongoDB + Mongoose：数据持久化
- JSON Web Token：登录认证与鉴权
- bcryptjs：密码哈希
- dotenv：环境变量管理
- cors：跨域支持
- Socket.IO：实时通信
- LangChain + OpenAI 兼容接口：智能体编排、流式输出和工具调用
- tsx：TypeScript 开发和脚本执行

## 项目结构

```text
apps/
├─ web/                         # Vue 3 前端
│  ├─ src/
│  │  ├─ api/                   # 接口请求
│  │  ├─ assets/                # 静态资源（图片、图标等）
│  │  ├─ components/            # 通用组件
│  │  ├─ directive/             # 自定义指令
│  │  ├─ icons/                 # SVG 图标注册
│  │  ├─ layout/                # 布局组件（侧边栏、导航栏、标签页等）
│  │  ├─ router/                # 路由配置与权限控制入口
│  │  ├─ stores/                # Pinia 状态（auth / permission / tagsView）
│  │  ├─ styles/                # 全局样式与 SCSS 变量
│  │  ├─ utils/                 # Auth、Axios、Socket、校验和标题工具
│  │  └─ views/                 # 页面视图与学习示例（含智能体聊天）
│  ├─ index.html
│  ├─ package.json
│  ├─ tsconfig.json
│  └─ vite.config.ts
├─ api/                         # Express 后端
│  ├─ src/
│  │  ├─ config/                # 数据库配置
│  │  ├─ middleware/            # 鉴权中间件
│  │  ├─ models/                # Mongoose 模型
│  │  ├─ routes/                # API 路由
│  │  ├─ agent/                 # LangChain 智能体、模型和工具
│  │  ├─ socket/                # Socket.IO 鉴权、事件和类型
│  │  ├─ scripts/               # seed 脚本
│  │  ├─ types/                 # 类型声明
│  │  ├─ server.ts
│  │  └─ ...
│  ├─ package.json
│  └─ tsconfig.json
├─ README.md
└─ 面试题.md
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
MONGODB_URI=mongodb://127.0.0.1:27017/quiz
JWT_SECRET=change-me
SEED_ADMIN_USERNAME=admin
SEED_ADMIN_PASSWORD=admin123
OPENAI_API_KEY=your-api-key
OPENAI_BASE_URL=https://your-openai-compatible-endpoint/v1
OPENAI_MODEL=gpt-5.6-sol
```

`OPENAI_BASE_URL` 需要填写 OpenAI 兼容服务的接口地址，通常以 `/v1` 结尾；如果使用官方 OpenAI 接口，可配置为 `https://api.openai.com/v1`。也可以使用 Windows 用户级或系统级环境变量，但修改后需要重新打开终端或 IDE，确保 Node.js 进程能够读取到新变量。

请勿将包含真实密钥、数据库密码或生产配置的 `.env` 文件提交到 Git。

## 启动项目

建议先启动 MongoDB，再依次启动后端和前端。

```bash
# 终端 1：初始化管理员账号（可选，但推荐）
cd api
npm run seed

# 终端 2：启动后端
cd api
npm run dev
```

```bash
# 终端 3：启动前端
cd web
npm run dev
```

访问地址：

- 前端：<http://localhost:5173>
- 后端：`http://localhost:3000`

登录后可以在前端“智能体”页面创建会话并发送消息。智能体通过 Socket.IO 返回流式文本，并将会话和消息保存到 MongoDB；询问当前日期或时间时，会调用 `get_current_time` 工具获取实时结果。

生产构建与预览：

```bash
cd web
npm run build
npm run preview
```

## 默认登录信息

项目已支持登录认证，并且后端会在必要时自动创建管理员账户。默认的演示账号如下：

```text
用户名：admin
密码：admin123
```

如果你需要更稳定的演示环境，也可以先执行：

```bash
cd api
npm run seed
```

然后使用上述账号登录。

## 主要接口

后端接口默认挂载在 `http://localhost:3000/api`，除登录接口外均需要在请求头中携带 JWT：

```text
POST /auth/login                         登录并获取 Token
GET  /auth/me                            获取当前用户
GET  /auth/info                          获取用户信息和角色
GET  /agent/conversations                查询当前用户的会话
POST /agent/conversations                创建智能体会话
GET  /agent/conversations/:id/messages   查询会话历史消息
```

智能体实时通信使用 Socket.IO，连接地址为 `http://localhost:3000`，握手时通过 `auth.token` 传入登录 Token。主要事件包括：

```text
chat:join       加入会话房间
chat:leave      离开会话房间
chat:send       发送消息
agent:delta     接收智能体流式文本片段
agent:error     接收智能体调用错误
```

## 学习内容

当前代码重点覆盖：

- Vue 3 `<script setup>`、`ref`、`computed`、生命周期和自定义指令
- TypeScript 在 Vue 组件、路由、Pinia 与 Express 中的类型设计
- Vue Router 4 的嵌套路由、动态参数、重定向、404/401 和路由守卫
- Pinia 状态拆分：权限、认证、标签页、错误日志等
- 管理后台常见布局：Sidebar、Navbar、Breadcrumb、TagsView、AppMain
- 权限控制：角色判断、动态菜单生成和路由挂载
- 管理后台功能：图表、全屏、页面标题、SVG 图标、复制功能
- Express + JWT + MongoDB 的登录接口、鉴权中间件与数据模型
- LangChain 智能体、OpenAI 兼容模型配置、实时工具调用和流式输出
- Socket.IO 鉴权、会话房间、消息持久化与前端增量渲染
- Vue 2 到 Vue 3 的组件、事件和模板语法迁移思路
- Vite 别名、SVG 图标和 Sass 工程化配置

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
feat(web): add permission route guard
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
- [Ant Design Vue](https://antdv.com/)

## 免责声明

本项目仅用于学习和技术验证。代码、目录结构和交互设计参考了开源项目，但已根据 Vue 3 学习目标进行调整和重构。使用时请遵守相关开源项目的许可证要求。
