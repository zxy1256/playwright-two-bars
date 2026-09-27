# Playwright Two Bars

**One test. Two targets. A result you can put in context.**

Playwright Two Bars runs your Playwright tests against a **control** and a
**candidate**, then reports their results together. A failing control invalidates
the comparison, so an existing failure does not get labeled a new regression.

```text
                      C    T
Cart                  ┃    ┃    PASSED
Delivery estimate     ┃    ╳    REGRESSION
Reader rewards        ╳    ╳    INCONCLUSIVE
```

The two bars are inspired by a test kit's control and test indicators. Here a
green bar means that target passed; a red bar means it failed. C is the control,
T is the candidate under test. Text labels accompany every color.

## Try the demo

Requires Node.js 20+.

```sh
npm install
npx playwright install chromium
npm run demo
```

Open `two-bars-report/index.html`. The self-contained report works from disk and
includes filtering, both target results, retry attempts, and failure messages.
Machine-readable results are in `two-bars-report/report.json`.

If Chrome is already installed, `DEMO_BROWSER_CHANNEL=chrome npm run demo` uses it
instead of the downloaded Chromium. The same variable works with `verify:demo`.

The bookshop demo deliberately produces **one pass, one regression, and one
inconclusive comparison**. The command exits with code 1 because of the deliberate
regression. To see an all-green run:

```sh
DEMO_FIXED=1 npm run demo
```

Run `npm run demo:serve` to explore the app at
<http://127.0.0.1:4173/control/> and <http://127.0.0.1:4173/candidate/>.
Stop this server before `npm run demo`, which starts its own server.

## Add it to an existing Playwright suite

This repository is the initial source release; it has not been published to npm.
Build an installable archive with `npm pack`, then in your application:

```sh
npm install -D @playwright/test /absolute/path/to/playwright-two-bars-0.1.0.tgz
```

Configure the two targets in `playwright.config.ts`:

```ts
import { defineConfig } from '@playwright/test';
import { twoBarsProjects } from 'playwright-two-bars';

export default defineConfig({
  testDir: './tests',
  reporter: [['playwright-two-bars/reporter']],
  projects: twoBarsProjects({
    control: { use: { baseURL: 'https://staging.example.com' } },
    candidate: { use: { baseURL: 'http://localhost:3000' } },
  }),
});
```

Keep writing normal Playwright tests. Each runs once in each project:

```ts
import { test, expect } from '@playwright/test';

test('home page is available', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Welcome' })).toBeVisible();
});
```

Run `npx playwright test`. No custom runner or test wrapper is required. Existing
fixtures, hooks, retries, browsers, and assertions remain Playwright features.
Use relative URLs in tests so each project's `baseURL` takes effect.

## What the results mean

| Control | Candidate | Comparison | Default CI exit |
| --- | --- | --- | --- |
| Pass | Pass | Passed | 0 |
| Pass | Fail or test timeout | Regression | 1 |
| Fail or test timeout | Any | Inconclusive | 0 |
| Flaky, skipped, missing, interrupted | Any | Inconclusive | 0 |
| Pass | Flaky, skipped, missing, interrupted | Inconclusive | 0 |

The exit column assumes there are no other failures. Any regression fails the
run. Runner errors, test-loading errors, ordinary unpaired failures, global
timeouts, and interrupted runs remain failures/nonzero exits. Playwright's
`failOnFlakyTests` setting is honored when available.

**Inconclusive is not a successful candidate check.** It means the available
evidence cannot establish a regression. To require conclusive results in CI:

```ts
reporter: [['playwright-two-bars/reporter', {
  failOnInconclusive: true,
  outputDir: 'two-bars-report', // relative to Playwright's rootDir (usually testDir)
}]],
```

Flaky means a test failed before passing on retry. Both sides must pass without a
failed attempt for a conclusive pass. Tests marked with `test.fail()` are evaluated
by actual execution status: an expected failure is not a healthy control. Prefer
positive assertions for paired checks.
An unexpected pass of a test marked `test.fail()` remains a run error.

“Regression” describes the observed difference. Different data, credentials, or
environment configuration can also cause it; the reporter does not prove the code
change was the cause.

## More than two URLs

Each target is a regular Playwright `Project`. Give it different storage state,
headers, fixtures, browser options, dependencies, or test selection. Shared
options go in `shared`; target options override them. `use` and `metadata` are
shallow-merged; other project fields are replaced.

```ts
projects: twoBarsProjects({
  name: 'checkout-chromium',
  shared: { use: { browserName: 'chromium', locale: 'en-US' }, retries: 1 },
  control: {
    use: { baseURL: 'https://staging.example.com', storageState: 'auth/control.json' },
  },
  candidate: {
    use: { baseURL: 'http://localhost:3000', storageState: 'auth/candidate.json' },
  },
}),
```

Custom fixture options can be typed with
`twoBarsProjects<MyTestOptions, MyWorkerOptions>(...)`.

For multiple browsers or comparisons, spread multiple `twoBarsProjects(...)`
arrays into `projects`, giving each a unique `name`. The generated project names
are `<name>:control` and `<name>:candidate`. Explicit project names are supported.
The helper reserves the `playwright-two-bars` project metadata key.

### Different test implementations

Sometimes the control is a legacy API or reference implementation. Use different
`testMatch` settings and attach the same explicit ID to equivalent tests:

```ts
import { pairId } from 'playwright-two-bars';

// legacy.spec.ts — selected by the control project
test('legacy lookup', { annotation: pairId('customer-lookup') }, async () => {
  // Assert behavior of the reference implementation.
});

// replacement.spec.ts — selected by the candidate project
test('new lookup', { annotation: pairId('customer-lookup') }, async () => {
  // Assert the equivalent behavior of the new implementation.
});
```

A runnable example that does not need a browser:

```sh
npm run build
npx playwright test -c examples/asymmetric/playwright.config.ts
```

Without an explicit ID, pairing uses comparison name, relative file path, describe
hierarchy, test title, and repeat index. Parameterized tests should have unique
titles. Explicit IDs replace the file/title portion; duplicates on the same side
are errors. Missing counterparts are inconclusive. Retries are grouped into their
original test, while `repeatEach` runs are separate comparisons.

## Reporter and CI details

- Reporter options: `outputDir`, `failOnInconclusive` (default `false`), and
  `quiet` (default `false`, suppresses terminal output only).
- The JSON report has `schemaVersion: 1`, summary counts, comparison reasons,
  per-side attempts/errors, and original `runStatus` versus resulting `exitStatus`.
- Two Bars uses Playwright's documented reporter `onEnd` status override. Other
  reporters still show the native individual test outcomes; they do not acquire a
  new native Playwright “inconclusive” status. Keep Two Bars as the only reporter
  that overrides exit status.
- Add Playwright's HTML reporter for native traces, screenshots, attachments, and
  step details. The Two Bars report includes text failures and retries, not an
  embedded trace viewer. Reports can contain application data from error messages.
- Both projects run independently. Do not make the candidate depend on the control:
  Playwright may skip dependent projects when a control fails. Share setup projects
  instead. Avoid `maxFailures` if you want every comparison to complete.
- Selecting just one target with `--project` yields inconclusive comparisons.
- Distributed/sharded aggregation is not yet a supported release workflow. Run both
  sides in a single Playwright invocation for a complete authoritative report.
- This executes tests twice. Use accounts and environments appropriate for the
  actions your tests perform, especially when the control is production.

The implementation uses the public [Playwright projects API](https://playwright.dev/docs/test-projects)
and [reporter API](https://playwright.dev/docs/api/class-reporter).

## Development

```sh
npm ci
npm test
npm run typecheck
npx playwright install chromium
npm run verify:demo
npm pack
```

`npm test` invokes real Playwright processes to verify pairing and exit policy,
including retries, missing counterparts, repetitions, duplicate IDs, unrelated
failures, and test-loading errors. `verify:demo` runs the real browser demo,
asserts all three outcomes, and checks the generated report's filters and mobile
layout. GitHub Actions runs these checks on Node 20 and 22.

MIT licensed. See [CONTRIBUTING.md](CONTRIBUTING.md).
Independent community project; not affiliated with Microsoft or Playwright.
