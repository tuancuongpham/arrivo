import { defineConfig } from '@playwright/test';

const port = 5199;

// Uses the locally installed Edge by default (PW_CHANNEL=chrome or chromium to switch),
// so no extra browser download is needed on Windows.
export default defineConfig({
  testDir: 'test/e2e',
  timeout: 60_000,
  fullyParallel: false,
  workers: 2,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${port}`,
    channel: process.env.PW_CHANNEL ?? 'msedge',
    viewport: { width: 1280, height: 900 },
  },
  webServer: {
    command: `npm run dev -- --port ${port} --strictPort`,
    url: `http://localhost:${port}`,
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
