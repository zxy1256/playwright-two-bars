const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { readFileSync } = require('node:fs');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const { chromium } = require('@playwright/test');

(async () => {
  const root = path.resolve(__dirname, '..');
  const result = spawnSync(process.execPath, [require.resolve('@playwright/test/cli'), 'test', '-c', 'examples/demo/playwright.config.ts'], {
    cwd: root, env: { ...process.env, DEMO_FIXED: '0' }, encoding: 'utf8', timeout: 60000,
  });
  process.stdout.write(result.stdout);
  process.stderr.write(result.stderr);
  assert.ifError(result.error);
  assert.equal(result.status, 1, 'The demo contains a deliberate regression');
  const reportDir = path.join(root, 'two-lines-report');
  const report = JSON.parse(readFileSync(path.join(reportDir, 'report.json'), 'utf8'));
  assert.deepEqual(report.summary, { passed: 1, regression: 1, inconclusive: 1 });
  const browser = await chromium.launch({ channel: process.env.DEMO_BROWSER_CHANNEL });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(pathToFileURL(path.join(reportDir, 'index.html')).href);
    assert.equal(await page.locator('article:visible').count(), 3);
    await page.getByRole('button', { name: 'Regression', exact: true }).click();
    assert.equal(await page.locator('article:visible').count(), 1);
    assert.match(await page.locator('article:visible').innerText(), /delivery estimate/);
    await page.locator('article:visible summary').click();
    assert.match(await page.locator('article:visible pre').first().innerText(), /Delivery unavailable/);
    await page.getByRole('button', { name: 'All comparisons' }).click();
    await page.locator('details[open] summary').click();
    await page.screenshot({ path: path.join(reportDir, 'preview.png'), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'Mobile report must not overflow');
    await page.screenshot({ path: path.join(reportDir, 'preview-mobile.png'), fullPage: true });
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
  console.log('Demo verified: 1 pass, 1 regression, 1 inconclusive; report filtering, details, and mobile layout passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
