const { test } = require('node:test');
const assert = require('node:assert/strict');
const { twoLinesProjects, pairId, METADATA_KEY } = require('../dist');
const { renderHtml } = require('../dist/html');

test('project overrides retain shared fixtures and metadata without mutating inputs', () => {
  const shared = { use: { locale: 'en-US', baseURL: 'http://shared' }, metadata: { owner: 'team' } };
  const projects = twoLinesProjects({ name: 'chrome', shared, control: { use: { baseURL: 'http://control' } }, candidate: {} });
  assert.equal(projects[0].use.locale, 'en-US');
  assert.equal(projects[0].use.baseURL, 'http://control');
  assert.equal(projects[1].use.baseURL, 'http://shared');
  assert.equal(shared.use.baseURL, 'http://shared');
  assert.equal(projects[0].metadata.owner, 'team');
  assert.deepEqual(projects[1].metadata[METADATA_KEY], { version: 1, pair: 'chrome', role: 'candidate' });
});
test('invalid project names and pair IDs are rejected', () => {
  assert.throws(() => twoLinesProjects({ name: ' ', control: {}, candidate: {} }));
  assert.throws(() => twoLinesProjects({ control: { name: 'same' }, candidate: { name: 'same' } }));
  assert.throws(() => pairId(''));
});
test('report HTML escapes arbitrary error text', () => {
  const html = renderHtml({ generatedAt: 'now', durationMs: 0, runStatus: 'failed', exitStatus: 'failed', summary: { passed: 0, regression: 0, inconclusive: 0 }, errors: ['<script>alert("oops")</script>'], comparisons: [] });
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(!html.includes('<script>alert('));
});
