import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { FullConfig, FullResult, Reporter, Suite, TestCase, TestError } from '@playwright/test/reporter';
import { METADATA_KEY, PAIR_ID_ANNOTATION, type PairMetadata } from './index';
import { verdict, type Line, type Comparison, type ReporterOptions, type TwoLinesReport } from './model';
import { renderHtml } from './html';

const missing = (): Line => ({ status: 'missing', durationMs: 0, attempts: [] });

function line(test: TestCase): Line {
  const attempts = test.results.map(result => ({
    status: result.status, retry: result.retry, durationMs: result.duration,
    errors: result.errors.map(error => error.message ?? error.value ?? 'Unknown error'),
  }));
  const last = attempts.at(-1);
  let status: Line['status'] = 'missing';
  if (last) {
    if (last.status === 'passed') status = attempts.some(a => a.status !== 'passed') ? 'flaky' : 'passed';
    else if (last.status === 'skipped') status = 'skipped';
    else if (last.status === 'interrupted') status = 'interrupted';
    else status = 'failed';
  }
  return { status, project: test.parent.project()?.name, durationMs: attempts.reduce((sum, a) => sum + a.durationMs, 0), attempts };
}

class TwoLinesReporter implements Reporter {
  private config!: FullConfig;
  private suite!: Suite;
  private errors: string[] = [];
  constructor(private options: ReporterOptions = {}) {}
  printsToStdio(): boolean { return !this.options.quiet; }
  onStdOut(chunk: string | Buffer): void { if (!this.options.quiet) process.stdout.write(chunk); }
  onStdErr(chunk: string | Buffer): void { if (!this.options.quiet) process.stderr.write(chunk); }
  onBegin(config: FullConfig, suite: Suite): void { this.config = config; this.suite = suite; }
  onError(error: TestError): void { this.errors.push(error.message ?? error.value ?? 'Unknown runner error'); }

  async onEnd(result: FullResult): Promise<{ status: FullResult['status'] }> {
    const groups = new Map<string, Comparison>();
    let ordinaryFailure = false;
    for (const test of this.suite?.allTests() ?? []) {
      const raw = test.parent.project()?.metadata[METADATA_KEY] as PairMetadata | undefined;
      if (!raw) {
        if (!test.ok()) ordinaryFailure = true;
        continue;
      }
      if (test.expectedStatus === 'failed' && test.results.at(-1)?.status === 'passed') {
        this.errors.push(`Unexpected pass in ${test.title}: remove test.fail() before using this as a positive paired check.`);
      }
      if (raw.version !== 1 || typeof raw.pair !== 'string' || !raw.pair.trim() || !['control', 'candidate'].includes(raw.role)) {
        this.errors.push(`Invalid Two Lines metadata on project ${test.parent.project()?.name}.`);
        continue;
      }
      const ids = test.annotations.filter(a => a.type === PAIR_ID_ANNOTATION);
      if (ids.length > 1 || (ids.length === 1 && !ids[0].description?.trim())) {
        this.errors.push(`Test ${test.title} must have at most one nonempty two-lines:id annotation.`);
        continue;
      }
      const file = path.relative(this.config.rootDir, test.location.file).split(path.sep).join('/');
      // titlePath is root, project, file, then describes and test title.
      const titles = test.titlePath().slice(3);
      const identity = ids[0]?.description ? ['explicit', ids[0].description] : ['automatic', file, ...titles];
      const key = JSON.stringify([raw.pair, identity, test.repeatEachIndex]);
      let group = groups.get(key);
      if (!group) {
        group = { id: key, pair: raw.pair, title: ids[0]?.description ?? titles.join(' › '), file,
          repeat: test.repeatEachIndex, control: missing(), candidate: missing(), verdict: 'inconclusive', reason: '' };
        groups.set(key, group);
      }
      if (group[raw.role].project !== undefined) {
        this.errors.push(`Duplicate ${raw.role} for ${group.title} in comparison ${raw.pair}. Use unique pair IDs or comparison names.`);
      } else group[raw.role] = line(test);
    }
    const comparisons = [...groups.values()].sort((a, b) => a.id.localeCompare(b.id));
    const summary = { passed: 0, regression: 0, inconclusive: 0 };
    for (const comparison of comparisons) {
      Object.assign(comparison, verdict(comparison.control, comparison.candidate));
      summary[comparison.verdict]++;
    }
    // Preserve runner errors, unrelated failures, interruptions and empty runs.
    let status = result.status;
    if (comparisons.length && result.status !== 'interrupted' && result.status !== 'timedout') {
      status = this.errors.length || ordinaryFailure || summary.regression ||
        (this.options.failOnInconclusive && summary.inconclusive) ||
        (this.config.failOnFlakyTests && this.suite.allTests().some(t => t.outcome() === 'flaky')) ? 'failed' : 'passed';
    } else if (this.errors.length && status === 'passed') status = 'failed';
    const report: TwoLinesReport = {
      schemaVersion: 1, generatedAt: new Date().toISOString(), durationMs: result.duration,
      runStatus: result.status, exitStatus: status, summary, errors: this.errors, comparisons,
    };
    const output = path.resolve(this.config?.rootDir ?? process.cwd(), this.options.outputDir ?? 'two-lines-report');
    await mkdir(output, { recursive: true });
    await Promise.all([
      writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n'),
      writeFile(path.join(output, 'index.html'), renderHtml(report)),
    ]);
    if (!this.options.quiet) {
      console.log('\n  Playwright Two Lines · C = control · T = candidate\n');
      for (const c of comparisons) console.log(`  C ${symbol(c.control)}  T ${symbol(c.candidate)}  ${c.verdict.toUpperCase().padEnd(12)} ${c.pair} › ${c.title}${c.repeat ? ` (repeat ${c.repeat + 1})` : ''}\n      ${c.reason}`);
      console.log(`\n  ${summary.passed} passed · ${summary.regression} regressions · ${summary.inconclusive} inconclusive`);
      for (const error of this.errors) console.error(`  Runner error: ${error}`);
      console.log(`  Report: ${path.join(output, 'index.html')}\n`);
    }
    return { status };
  }
}

function symbol(value: Line): string { return value.status === 'passed' ? '┃' : value.status === 'failed' ? '╳' : '?'; }

export = TwoLinesReporter;
