import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    // ExcelJS is intentionally isolated behind the lazy-loaded Importaciones route.
    // Keep warnings meaningful for unexpectedly large eager/application chunks.
    chunkSizeWarningLimit: 1000,
  },
})
