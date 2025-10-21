import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [vue()],
  // Use root path in development, /rss-agg/ in production
  base: mode === 'production' ? '/rss-agg/' : '/',
  build: {
    outDir: '../public-frontend',
  }
}))

