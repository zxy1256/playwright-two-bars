import { defineConfig } from '@playwright/test';
import { twoLinesProjects } from 'playwright-two-lines';

export default defineConfig({
  testDir: '.',
  testMatch: 'scenarios.spec.ts',
  workers: 2,
  retries: process.env.SCENARIO?.includes('flaky') ? 1 : 0,
  repeatEach: process.env.SCENARIO === 'repeat' ? 2 : 1,
  reporter: [[require.resolve('playwright-two-lines/reporter'), {
    outputDir: process.env.REPORT_DIR,
    failOnInconclusive: process.env.STRICT === '1',
    quiet: true,
  }]],
  projects: [
    ...twoLinesProjects({ name: 'fixture', control: {}, candidate: {} }),
    ...(process.env.SCENARIO === 'unpaired' ? [{ name: 'ordinary' }] : []),
  ],
});
