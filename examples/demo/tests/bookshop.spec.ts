import { test, expect } from '@playwright/test';

// These exact tests run in both projects. No Two Bars test wrapper required.
test.beforeEach(async ({ page }) => { await page.goto('./'); });

test('shoppers can add a book to their cart', async ({ page }) => {
  await page.getByRole('button', { name: 'Add to cart' }).click();
  await expect(page.getByRole('status')).toHaveText('Cart: 1 items');
});

test('shoppers see a delivery estimate', async ({ page }) => {
  await expect(page.getByTestId('delivery')).toHaveText('Arrives in 3 days', { timeout: 750 });
});

test('reader rewards are available', async ({ page }) => {
  await expect(page.getByTestId('rewards')).toHaveText('Rewards online', { timeout: 750 });
});
