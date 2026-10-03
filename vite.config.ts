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
    // Component tests render the whole app; under a full parallel run 5 s is too tight.
    testTimeout: 60_000,
    // Unit/component tests only; Playwright E2E lives in e2e/ (Part 13).
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/test/**',
        'src/main.tsx',
        'src/types/**',
        'src/vite-env.d.ts',
      ],
      reporter: ['text-summary', 'html'],
      // Part 13, FR-13.2: ≥ 70 % overall, ≥ 90 % lines for each pure-logic module.
      thresholds: {
        lines: 70,
        ...Object.fromEntries(
          [
            'src/features/workflows/editor/mapping.ts',
            'src/features/workflows/editor/editor-reducer.ts',
            'src/features/workflows/editor/graph-rules.ts',
            'src/features/workflows/editor/draft-saver.ts',
            'src/features/workflows/config/condition-model.ts',
            'src/features/workflows/config/references.ts',
            'src/features/auth/session/session.ts',
            'src/lib/error-presentation.ts',
            'src/features/workspaces/policy.ts',
          ].map((file) => [file, { lines: 90 }]),
        ),
      },
    },
  },
});
