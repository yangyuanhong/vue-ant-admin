<template>
  <main class="demo-page">
    <header class="demo-header">
      <div>
        <p class="eyebrow">Vue Router / interview example</p>
        <h1>路由传参实验室</h1>
        <p class="intro">点击下面的按钮，再观察浏览器地址栏和“当前路由收到的数据”。最后刷新页面，看看哪些数据仍然存在。</p>
      </div>
      <a-button @click="router.push('/')">返回首页</a-button>
    </header>

    <section class="address-bar">
      <span>当前地址</span>
      <code>{{ route.fullPath }}</code>
    </section>

    <section class="examples">
      <a-card class="example-card query-card">
        <template #title>
          <span class="card-title"><i>01</i> query 参数</span>
        </template>
        <p>适合筛选、分页等可分享的状态，参数会显示在 URL 的 <code>?</code> 后面。</p>
        <code class="path-example">/router-demo/query?keyword=vue3&amp;page=1</code>
        <a-button type="primary" block @click="showQuery">跳转并查看 query</a-button>
      </a-card>

      <a-card class="example-card params-card">
        <template #title>
          <span class="card-title"><i>02</i> 动态 params</span>
        </template>
        <p>适合用户详情、文章详情等资源标识，必须在路由路径中声明 <code>:id</code>。</p>
        <code class="path-example">/router-demo/user/:id → /router-demo/user/42</code>
        <a-button type="primary" block @click="showParams">跳转并查看 params</a-button>
      </a-card>

      <a-card class="example-card warning-card">
        <template #title>
          <span class="card-title"><i>03</i> 未声明的 params</span>
        </template>
        <p>这个路由没有 <code>:id</code>。Vue Router 4 会忽略对象里的 params，不能依赖它保存数据。</p>
        <code class="path-example">/router-demo/params-lost</code>
        <a-button block @click="showLostParams">故意传入 params</a-button>
      </a-card>
    </section>

    <section class="result-panel">
      <div class="result-heading">
        <div>
          <p class="eyebrow">Route state</p>
          <h2>当前路由收到的数据</h2>
        </div>
        <a-tag :color="routeKind.color">{{ routeKind.label }}</a-tag>
      </div>
      <div class="data-grid">
        <div>
          <span class="data-label">route.query</span>
          <pre>{{ formatData(route.query) }}</pre>
        </div>
        <div>
          <span class="data-label">route.params</span>
          <pre>{{ formatData(route.params) }}</pre>
        </div>
      </div>
      <p class="tip">现在刷新页面：query 和写进路径的 params 仍在，因为它们都属于 URL；未声明的 params 从一开始就没有进入 URL。</p>
    </section>

    <section class="mode-section">
      <div class="section-heading">
        <p class="eyebrow">Vue Router / history modes</p>
        <h2>Hash 和 History，刷新时到底差在哪？</h2>
        <p>当前这个项目使用的是 <code>createWebHistory()</code>。下面用同一个“用户详情”地址做对照。</p>
      </div>
      <div class="mode-grid">
        <a-card class="mode-card hash-mode">
          <template #title><span class="mode-title">Hash 模式 <a-tag color="green">不会把路由发给服务器</a-tag></span></template>
          <code class="mode-url">http://localhost:5173/#/user/42</code>
          <dl>
            <dt>浏览器跳转</dt>
            <dd>Vue Router 监听 <code>#</code> 后面的内容。</dd>
            <dt>刷新页面</dt>
            <dd>服务器只收到 <code>/</code>，通常直接返回 index.html，不会因为 <code>/user/42</code> 找不到文件而 404。</dd>
            <dt>代价</dt>
            <dd>URL 带有 <code>#</code>，看起来不如 history 模式简洁。</dd>
          </dl>
          <a-button block @click="showHashExample">在地址栏追加一个 hash</a-button>
        </a-card>

        <a-card class="mode-card history-mode">
          <template #title><span class="mode-title">History 模式 <a-tag color="blue">当前项目正在使用</a-tag></span></template>
          <code class="mode-url">http://localhost:5173/router-demo/user/42</code>
          <dl>
            <dt>浏览器跳转</dt>
            <dd>使用 HTML5 History API 修改真实路径，URL 更自然。</dd>
            <dt>刷新页面</dt>
            <dd>浏览器会真实请求 <code>/router-demo/user/42</code>，服务器必须 fallback 到 index.html，否则可能 404。</dd>
            <dt>当前配置</dt>
            <dd><code>createWebHistory()</code>，可直接点击上面的动态 params 示例体验。</dd>
          </dl>
          <a-button type="primary" block @click="showParams">跳转到真实 history 路由</a-button>
        </a-card>
      </div>
      <div class="server-note"><strong>一句话记忆：</strong>hash 把路由藏在 <code>#</code> 后，服务器看不见；history 把路由放进真实路径，刷新时服务器必须认识这条路径。</div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const routeKind = computed(() => {
  if (route.name === 'router-query') return { label: 'query', color: 'blue' }
  if (route.name === 'router-params') return { label: '动态 params', color: 'green' }
  return { label: '未声明 params', color: 'orange' }
})

const formatData = (data: Record<string, unknown>) =>
  Object.keys(data).length ? JSON.stringify(data, null, 2) : '{}（没有收到数据）'

const showQuery = () => {
  router.push({ name: 'router-query', query: { keyword: 'vue3', page: '1' } })
}

const showParams = () => {
  router.push({ name: 'router-params', params: { id: '42' } })
}

const showLostParams = () => {
  router.push({ name: 'router-params-lost', params: { id: '42' } })
}

const showHashExample = () => {
  window.location.hash = '/user/42'
}
</script>

<style scoped>
.demo-page {
  min-height: 100vh;
  box-sizing: border-box;
  padding: 48px clamp(20px, 6vw, 96px);
  color: #1e293b;
  background: #f3f7f7;
}

.demo-header,
.address-bar,
.result-panel,
.examples {
  max-width: 1180px;
  margin: 0 auto;
}

.demo-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 32px;
}

.eyebrow {
  margin: 0 0 10px;
  color: #0f766e;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 1.5px;
  text-transform: uppercase;
}

h1,
h2,
p {
  margin-top: 0;
}

h1 {
  margin-bottom: 12px;
  color: #12343b;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: clamp(32px, 5vw, 56px);
  font-weight: 500;
}

.intro {
  max-width: 650px;
  margin-bottom: 0;
  color: #52666b;
  line-height: 1.8;
}

.address-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  box-sizing: border-box;
  margin-bottom: 24px;
  padding: 14px 18px;
  border-left: 4px solid #0f766e;
  background: #fff;
  box-shadow: 0 8px 24px rgba(25, 60, 65, 0.07);
}

.address-bar span,
.data-label {
  color: #71848a;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.8px;
  text-transform: uppercase;
}

code {
  color: #9f3f31;
  font-family: 'Cascadia Code', Consolas, monospace;
  font-size: 13px;
}

.address-bar code {
  overflow: hidden;
  color: #145c62;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.examples {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}

.example-card {
  min-height: 250px;
  border-top: 4px solid #2b8c86;
}

.params-card {
  border-top-color: #3d7f9e;
}

.warning-card {
  border-top-color: #d88335;
}

.card-title {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #173d43;
}

.card-title i {
  color: #0f766e;
  font-size: 12px;
  font-style: normal;
  letter-spacing: 1px;
}

.example-card p {
  min-height: 68px;
  color: #61757a;
  line-height: 1.7;
}

.path-example {
  display: block;
  min-height: 38px;
  margin-bottom: 20px;
  color: #145c62;
  line-height: 1.5;
}

.result-panel {
  box-sizing: border-box;
  margin-top: 30px;
  padding: 28px;
  background: #12343b;
  color: #e6f1ef;
  box-shadow: 0 16px 38px rgba(25, 60, 65, 0.16);
}

.result-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.result-heading h2 {
  margin-bottom: 0;
  color: #fff;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 28px;
  font-weight: 500;
}

.data-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
  margin-top: 24px;
}

.data-grid > div {
  padding: 18px;
  background: rgba(255, 255, 255, 0.08);
}

.data-label {
  color: #91c9c0;
}

pre {
  min-height: 54px;
  margin: 12px 0 0;
  color: #f7d39b;
  font-family: 'Cascadia Code', Consolas, monospace;
  line-height: 1.6;
  white-space: pre-wrap;
}

.tip {
  margin: 22px 0 0;
  color: #b7cfcc;
  font-size: 13px;
  line-height: 1.7;
}

.mode-section {
  max-width: 1180px;
  margin: 64px auto 0;
}

.section-heading {
  margin-bottom: 22px;
}

.section-heading h2 {
  margin-bottom: 10px;
  color: #12343b;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 32px;
  font-weight: 500;
}

.section-heading > p:last-child {
  color: #61757a;
  line-height: 1.7;
}

.mode-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
}

.mode-card {
  border-top: 4px solid #76a98d;
}

.history-mode {
  border-top-color: #4b8daf;
}

.mode-title {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  color: #173d43;
}

.mode-url {
  display: block;
  margin: 4px 0 22px;
  padding: 12px;
  overflow-wrap: anywhere;
  color: #145c62;
  background: #eef5f3;
}

dl {
  margin: 0 0 20px;
}

dt {
  margin-top: 14px;
  color: #173d43;
  font-size: 13px;
  font-weight: 700;
}

dt:first-child {
  margin-top: 0;
}

dd {
  margin: 5px 0 0;
  color: #61757a;
  font-size: 13px;
  line-height: 1.7;
}

.server-note {
  margin-top: 18px;
  padding: 16px 18px;
  border-left: 4px solid #d88335;
  color: #52666b;
  background: #fff;
  line-height: 1.7;
}

@media (max-width: 800px) {
  .demo-page {
    padding: 32px 16px;
  }

  .demo-header,
  .address-bar {
    align-items: flex-start;
    flex-direction: column;
  }

  .examples,
  .data-grid,
  .mode-grid {
    grid-template-columns: 1fr;
  }
}
</style>