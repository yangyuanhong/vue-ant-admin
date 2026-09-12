import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import { createSvgIconsPlugin } from "vite-plugin-svg-icons";
import path from "node:path";

export default defineConfig({
  plugins: [vue(),createSvgIconsPlugin({ 
    iconDirs: [
      path.resolve(process.cwd(), "src/icons/svg"),
    ],
    symbolId: "icon-[name]"
  })],
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
  server: {
    port: 5173
  }
})
