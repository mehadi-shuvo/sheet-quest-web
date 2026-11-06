import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  use: {
    baseURL: 'http://127.0.0.1:3002',
    ...devices['Desktop Chrome'],
  },
  webServer: {
    command: 'npm run dev -- --port 3002',
    url: 'http://127.0.0.1:3002/spikes/univer',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
