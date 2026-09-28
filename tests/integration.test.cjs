const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { mkdtempSync, readFileSync, existsSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const cli = require.resolve('@playwright/test/cli');
function run(scenario, { strict = false, args = [] } = {}) {
  const directory = mkdtempSync(path.join(tmpdir(), 'two-lines-test-'));
  const result = spawnSync(process.execPath, [cli, 'test', '-c', 'tests/fixtures/playwright.config.ts', ...args], {
    cwd: root,
    env: { ...process.env, SCENARIO: scenario, REPORT_DIR: directory, STRICT: strict ? '1' : '0', FORCE_COLOR: '0' },
    encoding: 'utf8', timeout: 30000,
  });
  assert.ifError(result.error);
  assert.ok(existsSync(path.join(directory, 'report.json')), result.stdout + result.stderr);
  const report = JSON.parse(readFileSync(path.join(directory, 'report.json'), 'utf8'));
  return { code: result.status, report, output: result.stdout + result.stderr, directory };
}

for (const [scenario, verdict, code] of [
  ['pass', 'passed', 0], ['regression', 'regression', 1],
  ['invalid', 'inconclusive', 0], ['both-fail', 'inconclusive', 0],
  ['skip', 'inconclusive', 0], ['flaky', 'inconclusive', 0],
  ['expected-failure', 'inconclusive', 0],
  ['skip-control', 'inconclusive', 0], ['candidate-flaky', 'inconclusive', 0],
  ['timeout', 'regression', 1],
]) {
  test(`${scenario}: paired verdict and actual Playwright exit code`, () => {
    const result = run(scenario);
    assert.equal(result.code, code, result.output);
    assert.equal(result.report.comparisons.length, 1);
    assert.equal(result.report.comparisons[0].verdict, verdict);
    assert.equal(result.report.summary[verdict], 1);
  });
}
test('strict inconclusive policy blocks CI', () => {
  assert.equal(run('invalid', { strict: true }).code, 1);
});
test('unexpected passes do not hide a Playwright failure annotation error', () => {
  const { report, code } = run('unexpected-pass');
  assert.equal(code, 1);
  assert.match(report.errors.join('\n'), /Unexpected pass/);
});
test('a missing project cannot turn into a pass', () => {
  const { report, code } = run('pass', { args: ['--project=fixture:candidate'] });
  assert.equal(code, 0);
  assert.equal(report.comparisons[0].control.status, 'missing');
  assert.equal(report.comparisons[0].verdict, 'inconclusive');
});
test('repeatEach results do not collide', () => {
  const { report, code } = run('repeat');
  assert.equal(code, 0);
  assert.equal(report.comparisons.length, 2);
  assert.equal(report.summary.passed, 2);
});
test('unpaired test failures remain failures', () => {
  const { report, code } = run('unpaired');
  assert.equal(code, 1);
  assert.equal(report.summary.passed, 1);
});
test('test loading errors remain failures', () => {
  const { report, code } = run('load-error');
  assert.equal(code, 1);
  assert.match(report.errors.join('\n'), /deliberate module load failure/);
});
test('ambiguous pair IDs fail loudly', () => {
  const { report, code } = run('duplicate');
  assert.equal(code, 1);
  assert.match(report.errors.join('\n'), /Duplicate/);
});
