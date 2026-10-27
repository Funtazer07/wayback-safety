import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'

// GitHub Pages serves the app from a subfolder, passed in by the deploy workflow.
const base = `${process.env.BASE_PATH ?? ''}/`

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      // A safety app should not keep running an old version.
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'logo.svg', 'apple-touch-icon-180x180.png'],
      // The generated service worker cannot show push notifications; push-sw.js can.
      workbox: { importScripts: ['push-sw.js'] },
      manifest: {
        name: 'WayBack Safety',
        short_name: 'WayBack',
        description: 'Get home safely at night in Eindhoven.',
        lang: 'en',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'portrait',
        // Keep in sync with --page in index.css and theme-color in index.html.
        theme_color: '#f2f8f4',
        background_color: '#f2f8f4',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
  },
})
