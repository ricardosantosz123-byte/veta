import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      // El generador de PDF (~1.2 MB) se descarga al usarlo; no hace falta en la instalación.
      // Offline básico: el shell (HTML, JS, CSS, íconos) queda en caché y cualquier ruta abre index.html.
      // Los datos siempre vienen de Supabase (no se cachean).
      workbox: { globIgnores: ['**/generar-*.js', '**/react-pdf*.js'], navigateFallback: '/index.html' },
      manifest: {
        name: 'Veta',
        short_name: 'Veta',
        description: 'Cotizador, pedidos, cobranza y producción para mueblerías y talleres.',
        lang: 'es-MX',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
})
