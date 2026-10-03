/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    port: 5173,
    // Same-origin in dev: no CORS, and httpOnly cookies just work.
    // VITE_PROXY_TARGET: backend on another port (default http://localhost:3000).
    proxy: {
      '/api': {
        target: process.env.VITE_PROXY_TARGET ?? 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    // jsdom keeping Node's AbortSignal (see the file).
    environment: './src/test/jsdom-environment.ts',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
});
