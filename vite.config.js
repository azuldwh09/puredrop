import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const isMobileBuild = process.env.MOBILE_BUILD === 'true'

export default defineConfig({
  logLevel: 'error',
  base: isMobileBuild ? './' : '/',
  plugins: [
    react(),
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 3000,
  }
})
