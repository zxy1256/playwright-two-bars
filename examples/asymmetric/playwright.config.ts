import { defineConfig } from '@playwright/test';
import { twoBarsProjects } from 'playwright-two-bars';

export default defineConfig({
  testDir: '.',
  reporter: [[require.resolve('playwright-two-bars/reporter')]],
  projects: twoBarsProjects({
    name: 'different-implementations',
    control: { testMatch: 'legacy.spec.ts' },
    candidate: { testMatch: 'replacement.spec.ts' },
  }),
});
