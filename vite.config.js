import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { resolve } from 'path'

const isMobileBuild = process.env.MOBILE_BUILD === 'true'

export default defineConfig({
  logLevel: 'error',
  base: isMobileBuild ? './' : '/',
  plugins: [
    react(),
  ],
  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 3000,
  }
})
