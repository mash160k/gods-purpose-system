import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.ico',
        'en_kjv.json',
        '*.png',
        '*.jpg',
        '*.jpeg'
      ],
      manifest: {
        name: "God's Purpose System",
        short_name: "GPS Bible",
        description: "1-Year Chronological Audio Bible Walk",
        theme_color: '#12161B',
        background_color: '#12161B',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: '/A splash.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/A splash.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json,jpg,jpeg}'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.origin.includes('audiotreasure.com'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'gps-bible-audio-v1',
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 30 * 24 * 60 * 60
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ]
});