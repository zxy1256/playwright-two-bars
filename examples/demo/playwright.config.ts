import { defineConfig } from '@playwright/test';
import { twoLinesProjects } from 'playwright-two-lines';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  workers: 2,
  retries: 0,
  reporter: [[require.resolve('playwright-two-lines/reporter'), { outputDir: '../../../two-lines-report' }]],
  use: { browserName: 'chromium', headless: true, channel: process.env.DEMO_BROWSER_CHANNEL },
  projects: twoLinesProjects({
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
