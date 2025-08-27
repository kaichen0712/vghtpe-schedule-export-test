import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/vghtpe-schedule-export-zyj/',  // ⚠️ 若是 repo subpath 必須這樣
  build: {
    outDir: 'dist'
  }
})
