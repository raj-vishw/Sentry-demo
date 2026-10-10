/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  build: {
    // Vite already defaults to this, but pinned explicitly so it's a
    // documented decision, not an implicit default someone could flip on.
    sourcemap: false,
  },
  server: {
    // Pinned, not left to Vite's "pick another port if taken" default —
    // this is the demo instance and must always be 5174, strictly, so it
    // never collides with (or silently drifts onto) the main sentry
    // instance's 5173. If 5174 is already taken, this fails loudly
    // instead of moving to 5175/5176/...
    port: 5174,
    strictPort: true,
    proxy: {
      // Makes the browser see the API as same-origin, which is what lets
      // the refresh-token cookie work with SameSite=Lax in dev without
      // HTTPS. Target is overridable for Docker Compose, where the backend
      // is reachable as `backend`, not `localhost`.
      '/api': {
        target: process.env.VITE_API_PROXY_TARGET ?? 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: true,
  },
})
