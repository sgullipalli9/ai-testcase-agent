/**
 * The test-case model is the contract between the LLM and everything downstream.
 *
 * Design choice: the LLM never writes free-form Playwright code. It emits test cases whose
 * steps use a small, typed DSL. Deterministic code (src/steps) turns that DSL into
 * (a) live browser actions for validation and (b) Playwright source for the spec file.
 * One definition per action => what we validate is exactly what we ship.
 */

/** How to find an element. Mirrors Playwright's recommended locator strategies, in priority order. */
export type Target =
  | { testId: string; nth?: number }
  | { role: string; name?: string; exact?: boolean; nth?: number }
  | { label: string; exact?: boolean; nth?: number }
  | { placeholder: string; nth?: number }
  | { text: string; exact?: boolean; nth?: number }
  | { css: string; nth?: number };

interface StepBase {
  /** Optional human wording used in the manual test case. Generated automatically when absent. */
  note?: string;
}

export type Step = StepBase &
  (
    | { action: 'goto'; path: string }
    | { action: 'click'; target: Target }
    | { action: 'fill'; target: Target; value: string }
    | { action: 'select'; target: Target; value: string }
    | { action: 'press'; target: Target; key: string }
    | { action: 'check'; target: Target }
    | { action: 'expectVisible'; target: Target }
    | { action: 'expectHidden'; target: Target }
    | { action: 'expectText'; target: Target; text: string; exact?: boolean }
    | { action: 'expectValue'; target: Target; value: string }
    | { action: 'expectCount'; target: Target; count: number }
    | { action: 'expectUrl'; contains: string }
    | { action: 'expectSorted'; target: Target; order: 'asc' | 'desc'; by: 'text' | 'number' }
  );

export type StepAction = Step['action'];

export const TEST_TYPES = [
  'functional',
  'negative',
  'boundary',
  'state-transition',
  'e2e',
  'ui',
  'accessibility',
  'security',
] as const;
export type TestType = (typeof TEST_TYPES)[number];

export const PRIORITIES = ['P0', 'P1', 'P2', 'P3'] as const;
export type Priority = (typeof PRIORITIES)[number];

export interface TestCase {
  /** e.g. TC-LOGIN-001 */
  id: string;
  title: string;
  /** Why this case exists / which risk it covers. */
  objective: string;
  type: TestType;
  priority: Priority;
  /** Test-design technique used (equivalence partitioning, boundary value, decision table, ...). */
  technique?: string;
  tags: string[];
  preconditions: string[];
  steps: Step[];
  expectedResult: string;
}

/** Outcome of replaying a test case in a real browser. */
export type ValidationStatus =
  | 'validated' // passed on first replay
  | 'healed' // failed, the healer fixed it, now passes
  | 'suspected-defect' // failing, and the healer believes the app (not the test) is wrong
  | 'quarantined' // still failing after all heal attempts -> emitted as test.fixme
  | 'not-validated'; // validation was skipped (--no-validate or `render`)

export interface ValidatedTestCase extends TestCase {
  validation: {
    status: ValidationStatus;
    attempts: number;
    lastError?: string;
    rationale?: string;
  };
}

export interface TestSuite {
  site: string;
  module: string;
  generatedAt: string;
  generator: { model: string; provider: string };
  coverageSummary: string;
  testCases: ValidatedTestCase[];
  metrics?: RunMetrics;
}

export interface RunMetrics {
  agentTurns: number;
  toolCalls: number;
  groundingRejections: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  durationMs: number;
  statusCounts: Record<ValidationStatus, number>;
}
