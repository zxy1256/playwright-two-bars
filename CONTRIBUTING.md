# Contributing

Run `npm ci`, `npm test`, and `npm run typecheck` before submitting a change.
For changes to the demo or report UI, install Chromium with
`npx playwright install chromium` and run `npm run verify:demo`.

Keep the integration based on public Playwright APIs. Add an integration scenario
when changing pairing or exit-code behavior: those semantics determine whether
CI catches a regression. Avoid changes that silently classify unavailable or
ambiguous evidence as a pass.

Bug reports should include Node and Playwright versions, a minimal config/test,
expected versus actual verdict, and a redacted JSON report when useful.

To prepare a release, update the version, run all checks, inspect `npm pack
--dry-run`, and test the archive in a fresh consumer project. Publication and a
public repository are separate maintainer steps; the local build does not publish.
