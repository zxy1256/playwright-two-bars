import { defineConfig } from '@playwright/test';
import { twoBarsProjects } from 'playwright-two-bars';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  workers: 2,
  retries: 0,
  reporter: [[require.resolve('playwright-two-bars/reporter'), { outputDir: '../../../two-bars-report' }]],
  use: { browserName: 'chromium', headless: true, channel: process.env.DEMO_BROWSER_CHANNEL },
  projects: twoBarsProjects({
    name: 'bookshop',
    control: { use: { baseURL: 'http://127.0.0.1:4173/control/' } },
    candidate: { use: { baseURL: 'http://127.0.0.1:4173/candidate/' } },
  }),
  webServer: {
    command: 'node server.mjs',
    url: 'http://127.0.0.1:4173/control/',
    reuseExistingServer: false,
  },
});
