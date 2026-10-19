import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.TRIBECA_AUDIT_URL
  || 'https://aulatribeca.github.io/tribeca-aula-v0.1/';

// Protected by design: no screenshots, video, saved sessions, HARs, or traces.
// GitHub Actions logs and artifacts of a public repository are public.
export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 20_000 },
  reporter: 'dot',
  use: {
    baseURL,
    headless: true,
    actionTimeout: 15_000,
    navigationTimeout: 35_000,
    screenshot: 'off',
    trace: 'off',
    video: 'off',
    acceptDownloads: false,
    serviceWorkers: 'block', // deterministic first-pass layout, PWA tested separately
  },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'] } },
    { name: 'tablet-webkit', use: { ...devices['iPad (gen 7)'] } },
  ],
});
