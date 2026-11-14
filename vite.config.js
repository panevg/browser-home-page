import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';
import { feedProxy } from './vite-plugins/feed-proxy.js';

// The port is fixed on purpose: localStorage (bookmarks, widgets) is bound to the origin,
// so the address must not change between runs. `strictPort` makes Vite fail instead of picking another one.
// Same-origin proxies: the browser talks to localhost, Vite forwards the request. This avoids CORS errors
// from services that send no Access-Control-Allow-Origin header. They work in `dev` and `preview` only.
const proxy = {
  '/ddg-ac': { target: 'https://ac.duckduckgo.com', changeOrigin: true, rewrite: p => p.replace(/^\/ddg-ac/, '') },
  '/gh-profile': { target: 'https://github.com', changeOrigin: true, rewrite: p => p.replace(/^\/gh-profile/, '') },
};

export default defineConfig({
  base: './', // relative asset paths: dist/ works from any folder or sub-path
  plugins: [vue(), feedProxy()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: { port: 2783, strictPort: true, proxy },
  preview: { port: 2783, strictPort: true, proxy },
  // Unit tests (`npm test`). The environment is jsdom (DOM, localStorage); files that need Node say so with
  // a `// @vitest-environment node` comment on top.
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.js'],
    clearMocks: true,
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{js,vue}', 'vite-plugins/**/*.js'],
      exclude: ['src/main.js', 'src/**/lang/*.js', 'src/locales/{en-GB,uk}.js'],
      reporter: ['text', 'text-summary', 'lcov'],
    },
  },
});
