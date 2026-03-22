import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      '/proxy/nps': {
        target:       'https://npsnav.in',
        changeOrigin: true,
        rewrite:      (path) => path.replace(/^\/proxy\/nps/, ''),
      },
    },
  },
})