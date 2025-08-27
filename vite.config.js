import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/vghtpe-schedule-export-zyj/', // ← 改成你的 repo 名稱
  build: {
    outDir: 'dist' // 預設就是 dist，保險寫上
  }
})
