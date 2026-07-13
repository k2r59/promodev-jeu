import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// En dev, on proxifie /api vers le serveur Express (port 3001).
export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
})
