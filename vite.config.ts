import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  publicDir: false,
  server: {
    host: '127.0.0.1',
    proxy: Object.fromEntries(['/api','/theme.js','/favicon.svg'].map(path => [path, {
      target: 'http://127.0.0.1:3333', changeOrigin: true,
      headers: { origin: 'http://127.0.0.1:3333' },
    }])),
  },
})
