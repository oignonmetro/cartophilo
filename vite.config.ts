import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { contentEditorApi } from './tools/content-editor/api-plugin.ts'

// `APP_BASE` is set to "/cartophilo/" by the GitHub Pages workflow.
// The Capacitor build keeps the default "/" since the APK serves from the web root.
const base = process.env.APP_BASE ?? '/'

export default defineConfig({
  base,
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    watch: {
      // L'éditeur de contenu (`tools/content-editor/api-plugin.ts`) écrit
      // directement dans ces fichiers à l'enregistrement d'un rappel ou d'un
      // exercice : sans cette exclusion, Vite les voit changer comme
      // n'importe quel fichier du dépôt et recharge la page entière, ce qui
      // fait perdre la sélection en cours dans l'éditeur. Cette source n'est
      // de toute façon jamais importée par le bundle (l'app lit le JSON déjà
      // compilé sous `public/content/`), rien ne dépend donc de ce rechargement.
      ignored: ['**/content/courses/**'],
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    contentEditorApi(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'icons/*.png'],
      manifest: {
        name: 'Cartophilo',
        short_name: 'Cartophilo',
        description: "Apprendre du vocabulaire, leçon par leçon, même hors-ligne.",
        lang: 'fr',
        theme_color: '#14B8A6',
        background_color: '#FFF8EE',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '.',
        scope: '.',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Everything the app needs offline, courses included.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,json}'],
        navigateFallback: 'index.html',
      },
    }),
  ],
})
