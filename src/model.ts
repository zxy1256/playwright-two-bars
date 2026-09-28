export type LineStatus = 'passed' | 'failed' | 'flaky' | 'skipped' | 'interrupted' | 'missing';
export interface Line {
  status: LineStatus;
  project?: string;
  durationMs: number;
  attempts: { status: string; retry: number; durationMs: number; errors: string[] }[];
}
export interface Comparison {
  id: string;
  pair: string;
  title: string;
  file: string;
  repeat: number;
  control: Line;
  candidate: Line;
  verdict: 'passed' | 'regression' | 'inconclusive';
  reason: string;
}
export interface ReporterOptions {
  /** Relative to Playwright's rootDir; defaults to two-lines-report. */
  outputDir?: string;
  /** Inconclusive comparisons are neutral by default; opt in to a CI gate. */
  failOnInconclusive?: boolean;
  quiet?: boolean;
}
export interface TwoLinesReport {
  schemaVersion: 1;
  generatedAt: string;
  durationMs: number;
  runStatus: string;
  exitStatus: string;
  summary: { passed: number; regression: number; inconclusive: number };
  errors: string[];
  comparisons: Comparison[];
}

export function verdict(control: Line, candidate: Line): Pick<Comparison, 'verdict' | 'reason'> {
  if (control.status !== 'passed') {
    return { verdict: 'inconclusive', reason: `Control is ${control.status}; the comparison is not valid.` };
  }
  if (candidate.status === 'passed') {
    return { verdict: 'passed', reason: 'Control and candidate both passed.' };
  }
  if (candidate.status === 'failed') {
    return { verdict: 'regression', reason: 'Control passed, but candidate failed.' };
  }
  return { verdict: 'inconclusive', reason: `Control passed, but candidate is ${candidate.status}.` };
}
