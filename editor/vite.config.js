import { defineConfig } from 'vite'

export default defineConfig({
  base: '/xiyou/',
  server: { host: '127.0.0.1', port: 5199 },
  build: {
    assetsDir: 'app-assets',
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      input: {
        main: 'index.html',
        show: 'show.html',
        runtime: 'runtime.html'
      },
      external: ['/xiyou/vendor/mindar/mindar-image-three.prod.js']
    }
  }
})
