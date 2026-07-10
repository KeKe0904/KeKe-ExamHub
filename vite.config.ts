/**
 * KeKe ExamHub - 考试信息管理系统
 * 本项目使用 Trae IDE 开发
 * @author 落梦陳 (KeKe0904)
 * @github https://github.com/KeKe0904/KeKe-ExamHub
 * @license MIT
 */

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from "vite-tsconfig-paths";

// https://vite.dev/config/
export default defineConfig({
  build: {
    sourcemap: 'hidden',
  },
  server: {
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  plugins: [
    react({
      babel: {
        plugins: [
          'react-dev-locator',
        ],
      },
    }),
    tsconfigPaths()
  ],
})
