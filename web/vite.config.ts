import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import Components from "unplugin-vue-components/vite";
import { AntDesignVueResolver } from "unplugin-vue-components/resolvers";
import { fileURLToPath, URL } from 'node:url'
import { createSvgIconsPlugin } from "vite-plugin-svg-icons";
import path from "node:path";

export default defineConfig({
  plugins: [
    vue(),
    Components({
      dts: false,
      resolvers: [
        AntDesignVueResolver({
          importStyle: false,
        }),
      ],
    }),
    createSvgIconsPlugin({
      iconDirs: [path.resolve(process.cwd(), "src/icons/svg")],
      symbolId: "icon-[name]",
    }),
  ],
  resolve: {
    extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json', '.vue'],
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  css: {
    preprocessorOptions: {
      scss: {
        // 走 Sass 的 modern API，避免 legacy-js-api 弃用警告
        api: 'modern-compiler'
      }
    }
  },
  build: {
    // The largest remaining chunk is the cached Ant Design UI bundle
    // (~786 kB minified / ~237 kB gzip) after on-demand component imports.
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;

          if (id.includes("echarts")) return "vendor-echarts";
          if (id.includes("zrender")) return "vendor-zrender";
          if (id.includes("@advanced-chat")) return "vendor-chat";
          if (
            id.includes("ant-design-vue") ||
            id.includes("@ant-design")
          ) {
            return "vendor-antd";
          }
          if (id.includes("element-plus")) return "vendor-element";
          if (id.includes("socket.io") || id.includes("engine.io")) {
            return "vendor-socket";
          }
          if (
            id.includes("/vue/") ||
            id.includes("/@vue/") ||
            id.includes("vue-router") ||
            id.includes("pinia")
          ) {
            return "vendor-vue";
          }
          if (id.includes("lodash-es")) return "vendor-lodash";

          return;
        },
      },
    },
  },
  server: {
    port: 5173
  }
})
