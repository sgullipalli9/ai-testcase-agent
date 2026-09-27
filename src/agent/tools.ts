/**
 * Tools the explorer agent can call. Browser tools act on element refs from the latest snapshot
 * and return a fresh snapshot, so the model always reasons over the current page state.
 */
import type { BrowserContext, Page } from '@playwright/test';
import type { BrowserSession } from '../browser/session.js';
import { renderSnapshot, takeSnapshot, type PageSnapshot } from '../browser/snapshot.js';
import type { ModuleConfig } from '../config.js';
import type { ToolDefinition } from '../llm/types.js';
import { testCaseSchema } from '../model/schema.js';
import type { TestCase } from '../model/testCase.js';
import { formatErrors, validate } from '../model/validate.js';
import { GroundingIndex } from './grounding.js';

export interface ToolResult {
  content: string;
  isError?: boolean;
  submission?: { testCases: TestCase[]; coverageSummary: string };
}

const ref = { type: 'string', pattern: '^e\\d+$', description: 'Element ref from the latest snapshot, e.g. e3' } as const;

export const EXPLORER_TOOLS: ToolDefinition[] = [
  {
    name: 'browser_snapshot',
    description: 'Capture the current page: URL, title, interactive/text elements with refs and stable locators, and visible text.',
    input_schema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'browser_navigate',
    description: 'Navigate to a path on the application under test (same origin only). Returns a snapshot.',
    input_schema: { type: 'object', properties: { path: { type: 'string', minLength: 1 } }, required: ['path'], additionalProperties: false },
  },
  {
    name: 'browser_click',
    description: 'Click an element by ref. Returns a snapshot.',
    input_schema: { type: 'object', properties: { ref }, required: ['ref'], additionalProperties: false },
  },
  {
    name: 'browser_fill',
    description: 'Replace the value of an input by ref (use "" to clear). Returns a snapshot.',
    input_schema: { type: 'object', properties: { ref, value: { type: 'string' } }, required: ['ref', 'value'], additionalProperties: false },
  },
  {
    name: 'browser_select',
    description: 'Choose an option (value or label) in a <select> by ref. Returns a snapshot.',
    input_schema: { type: 'object', properties: { ref, value: { type: 'string' } }, required: ['ref', 'value'], additionalProperties: false },
  },
  {
    name: 'browser_reset',
    description: 'Start over: new clean browser context (logged in again if the module requires auth), at the module entry page. Returns a snapshot.',
    input_schema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'submit_test_cases',
    description: 'Submit the final test design for this module. Validated against the schema and against observed locators; on rejection, fix the reported issues and call again.',
    input_schema: {
      type: 'object',
      properties: {
        testCases: { type: 'array', items: testCaseSchema, minItems: 1 },
        coverageSummary: { type: 'string', minLength: 1, description: 'What is covered, what is deliberately not, and residual risks.' },
      },
      required: ['testCases', 'coverageSummary'],
      additionalProperties: false,
    },
  },
];

export class ExplorerToolbox {
  readonly grounding = new GroundingIndex();
  groundingRejections = 0;
  private context?: BrowserContext;
  private page?: Page;

  constructor(
    private readonly session: BrowserSession,
    private readonly mod: ModuleConfig,
    private readonly maxGroundingRejections = 3,
  ) {}

  async start(): Promise<void> {
    await this.reset();
  }

  async dispose(): Promise<void> {
    await this.context?.close();
  }

  private async reset(): Promise<void> {
    await this.context?.close();
    ({ context: this.context, page: this.page } = await this.session.newPage());
    if (this.mod.requiresAuth) await this.session.authenticate(this.page);
    await this.page.goto(this.mod.entryPath);
  }

  private async snap(): Promise<string> {
    const page = this.page!;
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(150); // let client-side rendering settle
    const s: PageSnapshot = await takeSnapshot(page, this.session.testIdAttribute);
    this.grounding.record(s);
    return renderSnapshot(s);
  }

  private byRef(r: string) {
    return this.page!.locator(`[data-agent-ref="${r}"]`);
  }

  async run(name: string, input: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'browser_snapshot':
          return { content: await this.snap() };
        case 'browser_navigate': {
          const path = String(input.path);
          if (!this.session.isAllowedUrl(path)) return { content: `Refused: ${path} is outside the application under test.`, isError: true };
          await this.page!.goto(path);
          return { content: await this.snap() };
        }
        case 'browser_click':
          await this.byRef(String(input.ref)).click({ timeout: 5000 });
          return { content: `Clicked ${input.ref}.\n${await this.snap()}` };
        case 'browser_fill':
          await this.byRef(String(input.ref)).fill(String(input.value), { timeout: 5000 });
          return { content: `Filled ${input.ref}.\n${await this.snap()}` };
        case 'browser_select':
          await this.byRef(String(input.ref)).selectOption(String(input.value), { timeout: 5000 });
          return { content: `Selected "${input.value}" in ${input.ref}.\n${await this.snap()}` };
        case 'browser_reset':
          await this.reset();
          return { content: `Reset done.\n${await this.snap()}` };
        case 'submit_test_cases':
          return this.submit(input);
        default:
          return { content: `Unknown tool ${name}`, isError: true };
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message.split('\n')[0] : String(err);
      return { content: `Tool ${name} failed: ${msg}\nTake a new snapshot — refs change after navigation.`, isError: true };
    }
  }

  private submit(input: Record<string, unknown>): ToolResult {
    const schemaErrors = validate(EXPLORER_TOOLS.at(-1)!.input_schema, input);
    if (schemaErrors.length) return { content: `Rejected — schema errors:\n${formatErrors(schemaErrors)}`, isError: true };

    const testCases = input.testCases as TestCase[];
    const problems: string[] = [];
    const ids = testCases.map((t) => t.id);
    const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
    if (dupes.length) problems.push(`Duplicate ids: ${[...new Set(dupes)].join(', ')}`);
    if (this.mod.maxCases && testCases.length > this.mod.maxCases) problems.push(`Too many cases (${testCases.length}); max is ${this.mod.maxCases}. Keep the highest-value ones.`);
    if (problems.length) return { content: `Rejected:\n${problems.map((p) => `- ${p}`).join('\n')}`, isError: true };

    const ungrounded = testCases.flatMap((tc) => this.grounding.checkTestCase(tc));
    if (ungrounded.length && this.groundingRejections < this.maxGroundingRejections) {
      this.groundingRejections++;
      return {
        content: `Rejected — ungrounded locators (use only locators from snapshots; explore more if needed):\n${ungrounded.map((u) => `- ${u}`).join('\n')}`,
        isError: true,
      };
    }
    return {
      content: `Accepted ${testCases.length} test cases. They will now be replayed in a real browser.`,
      submission: { testCases, coverageSummary: String(input.coverageSummary) },
    };
  }
}
