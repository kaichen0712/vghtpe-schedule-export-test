import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/vghtpe-schedule-export-zyj/',
  build: { outDir: 'dist' }
})
