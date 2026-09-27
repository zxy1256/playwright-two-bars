import { defineConfig } from '@playwright/test';
import { twoBarsProjects } from 'playwright-two-bars';

export default defineConfig({
  testDir: '.',
  testMatch: 'scenarios.spec.ts',
  workers: 2,
  retries: process.env.SCENARIO?.includes('flaky') ? 1 : 0,
  repeatEach: process.env.SCENARIO === 'repeat' ? 2 : 1,
  reporter: [[require.resolve('playwright-two-bars/reporter'), {
    outputDir: process.env.REPORT_DIR,
    failOnInconclusive: process.env.STRICT === '1',
    quiet: true,
  }]],
  projects: [
    ...twoBarsProjects({ name: 'fixture', control: {}, candidate: {} }),
    ...(process.env.SCENARIO === 'unpaired' ? [{ name: 'ordinary' }] : []),
  ],
});
