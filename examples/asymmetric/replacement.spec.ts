import { test, expect } from '@playwright/test';
import { pairId } from 'playwright-two-bars';

test('replacement shipping service', { annotation: pairId('shipping-total') }, async () => {
  const replacement = async (cart: { subtotal: number }) => ({ shipping: cart.subtotal >= 50 ? 0 : 5 });
  expect((await replacement({ subtotal: 25 })).shipping).toBe(5);
});
