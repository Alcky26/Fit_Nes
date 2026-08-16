import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Deployment note (see README "GitHub Pages"):
// base is relative ('./') rather than a hardcoded '/<repo-name>/'. Combined
// with HashRouter for client-side routing (src/App.tsx), the production
// build works unmodified from any GitHub Pages project subpath without
// needing to know the repository name at build time, and without a
// 404.html SPA-fallback hack. The same relative-path reasoning is why the
// manifest below uses start_url/scope: '.' instead of '/'.
export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      // We register the service worker ourselves from
      // src/pwa/registerServiceWorker.ts (via the virtual:pwa-register
      // module) instead of an auto-injected script, so it's an explicit,
      // visible part of the app's module graph like everything else.
      injectRegister: false,
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Fitness Tracker',
        short_name: 'Fitness',
        description: "A private, offline-first personal fitness tracker. Your workout data stays on your device.",
        theme_color: '#15171d',
        background_color: '#15171d',
        display: 'standalone',
        start_url: '.',
        scope: '.',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2}'],
        // HashRouter means every route is served from the same
        // precached index.html at the same path (only the #fragment
        // differs, which never reaches the server or the SW's fetch
        // handler) — so this isn't load-bearing for normal in-app
        // navigation. It's a defensive fallback for a direct/bookmarked
        // load while offline.
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts-stylesheets' },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: true,
  },
})
