import { defineConfig } from '@playwright/test';
import { twoLinesProjects } from 'playwright-two-lines';

export default defineConfig({
  testDir: '.',
  reporter: [[require.resolve('playwright-two-lines/reporter')]],
  projects: twoLinesProjects({
    name: 'different-implementations',
    control: { testMatch: 'legacy.spec.ts' },
    candidate: { testMatch: 'replacement.spec.ts' },
  }),
});
