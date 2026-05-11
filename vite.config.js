import base44 from "@base44/vite-plugin"
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const isMobileBuild = process.env.MOBILE_BUILD === 'true'

export default defineConfig({
  logLevel: 'error',
  base: isMobileBuild ? './' : '/',
  plugins: [
    base44({
      legacySDKImports: process.env.BASE44_LEGACY_SDK_IMPORTS === 'true',
      hmrNotifier: !isMobileBuild,
      navigationNotifier: !isMobileBuild,
      analyticsTracker: !isMobileBuild,
      visualEditAgent: !isMobileBuild
    }),
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
