import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // File events don't cross Windows bind mounts into Docker
    watch: { usePolling: process.env.CHOKIDAR_USEPOLLING === 'true' },
    // Browser calls /api on the Vite origin, so the backend needs no CORS in dev.
    // In docker-compose the target is the backend service; outside Docker, localhost.
    proxy: {
      '/api': {
        target: process.env.API_PROXY_TARGET ?? 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
