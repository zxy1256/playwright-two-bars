import { test, expect } from '@playwright/test';
import { pairId } from 'playwright-two-bars';

test('legacy shipping calculator', { annotation: pairId('shipping-total') }, () => {
  const legacy = (subtotal: number) => subtotal >= 50 ? 0 : 5;
  expect(legacy(25)).toBe(5);
});
