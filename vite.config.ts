import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',  // Output directory for build
    sourcemap: true,  // Helpful for debugging
  },
  server: {
    proxy: {
      "/api": "http://localhost:3000/",
    },
  },
})
