import { test, expect } from '@playwright/test';
import { pairId } from 'playwright-two-bars';

if (process.env.SCENARIO === 'load-error') throw new Error('deliberate module load failure');

test('same behavior on both targets', async ({}, info) => {
  const control = info.project.name.endsWith(':control');
  const scenario = process.env.SCENARIO;
  if (scenario === 'skip') test.skip(!control, 'candidate unavailable');
  if (scenario === 'skip-control') test.skip(control, 'control unavailable');
  if (scenario === 'unexpected-pass') test.fail();
  if (scenario === 'expected-failure') test.fail();
  if (scenario === 'flaky' && control && info.retry === 0) expect(false).toBe(true);
  if (scenario === 'candidate-flaky' && !control && info.retry === 0) expect(false).toBe(true);
  if (scenario === 'timeout' && !control) {
    test.setTimeout(50);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  if (scenario === 'unpaired' && info.project.name === 'ordinary') expect(false).toBe(true);
  if (scenario === 'regression' && !control) expect(false).toBe(true);
  if (scenario === 'invalid' && control) expect(false).toBe(true);
  if (scenario === 'both-fail' || scenario === 'expected-failure') expect(false).toBe(true);
});

if (process.env.SCENARIO === 'duplicate') {
  test('first', { annotation: pairId('duplicate') }, () => {});
  test('second', { annotation: pairId('duplicate') }, () => {});
}
