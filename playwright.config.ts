import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests against the real backend (Part 13, FR-13.3/13.4). The web app is built and
 * served by `vite preview`, proxying /api to the E2E backend (e2e/docker-compose.e2e.yml).
 * Retries are off: a flaky test is fixed or quarantined, never silently retried (FR-13.6).
 */
const API_PORT = process.env.E2E_API_PORT ?? '3200';
const API_TARGET = process.env.E2E_EXTERNAL_API ?? `http://localhost:${API_PORT}`;

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run build && npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
    env: { VITE_API_BASE_URL: '/api/v1', VITE_PROXY_TARGET: API_TARGET },
  },
});
