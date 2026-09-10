import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

export default defineConfig({
  plugins: [react()],
  build: {
    // Keep separate ES/EN HTML entry points so route-level language metadata is correct before React loads.
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        en: resolve(__dirname, 'en.html'),
      },
    },
    // ExcelJS is intentionally isolated behind the lazy-loaded Importaciones route.
    // Keep warnings meaningful for unexpectedly large eager/application chunks.
    chunkSizeWarningLimit: 1000,
  },
})
