import { defineConfig } from 'vite'

export default defineConfig({
  base: '/xiyou/',
  server: { host: '127.0.0.1', port: 5199 },
  build: { chunkSizeWarningLimit: 1500 }
})
