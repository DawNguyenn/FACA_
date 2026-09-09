import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      // Chuyển tiếp mọi request /api/* từ Vite (vd :5173) sang Backend Node.js
      '/api': {
        target: 'http://localhost:5000', // Cổng của Node.js Express Backend
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
