import type { Project } from '@playwright/test';

export type Role = 'control' | 'candidate';
export const METADATA_KEY = 'playwright-two-lines';
export const PAIR_ID_ANNOTATION = 'two-lines:id';

export interface PairMetadata { version: 1; pair: string; role: Role }

export interface TwoLinesProjectsOptions<TestArgs = {}, WorkerArgs = {}> {
  /** Unique comparison name, e.g. chromium or checkout. */
  name?: string;
  /** Options shared by both projects. use and metadata are shallow-merged. */
  shared?: Project<TestArgs, WorkerArgs>;
  control: Project<TestArgs, WorkerArgs>;
  candidate: Project<TestArgs, WorkerArgs>;
}

/** Run the same suite twice using native Playwright projects. */
export function twoLinesProjects<TestArgs = {}, WorkerArgs = {}>(
  options: TwoLinesProjectsOptions<TestArgs, WorkerArgs>,
): Project<TestArgs, WorkerArgs>[] {
  const pair = options.name ?? 'two-lines';
  if (!pair.trim()) throw new Error('Two Lines comparison name must not be empty.');
  const projects = (['control', 'candidate'] as const).map(role => {
    const project = options[role];
    return {
      ...options.shared,
      ...project,
      name: project.name ?? `${pair}:${role}`,
      use: { ...options.shared?.use, ...project.use },
      metadata: {
        ...options.shared?.metadata,
        ...project.metadata,
        [METADATA_KEY]: { version: 1, pair, role } satisfies PairMetadata,
      },
    };
  });
  if (projects[0].name === projects[1].name) {
    throw new Error('Two Lines control and candidate must have different project names.');
  }
  return projects;
}

/** Match differently named tests/files using the same stable ID on both sides. */
export function pairId(id: string): { type: string; description: string } {
  if (!id.trim()) throw new Error('Two Lines test ID must not be empty.');
  return { type: PAIR_ID_ANNOTATION, description: id };
}

export type { ReporterOptions, Comparison, Line, TwoLinesReport } from './model';
