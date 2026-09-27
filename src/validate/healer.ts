/**
 * Self-healing: when a generated test fails on replay, Claude triages it with the error and the
 * live page state, and decides whether the TEST is wrong (fix it), the APP is wrong (flag a
 * suspected defect), or the case is not reliably automatable (drop it).
 */
import type { GroundingIndex } from '../agent/grounding.js';
import { renderSnapshot } from '../browser/snapshot.js';
import type { ContentBlock, LLMProvider, Message, ToolDefinition, Usage } from '../llm/types.js';
import { testCaseSchema } from '../model/schema.js';
import type { TestCase } from '../model/testCase.js';
import { formatErrors, validate } from '../model/validate.js';
import { HEALER_SYSTEM_PROMPT } from '../agent/prompts.js';
import type { ReplayOutcome } from './replayer.js';

export type HealDecision =
  | { kind: 'fix'; testCase: TestCase; rationale: string }
  | { kind: 'defect'; rationale: string }
  | { kind: 'drop'; rationale: string };

const rationale = { type: 'string', minLength: 1 } as const;

export const HEALER_TOOLS: ToolDefinition[] = [
  {
    name: 'fix_test_case',
    description: 'The test is wrong. Provide the corrected full test case (same id).',
    input_schema: { type: 'object', properties: { testCase: testCaseSchema, rationale }, required: ['testCase', 'rationale'], additionalProperties: false },
  },
  {
    name: 'flag_suspected_defect',
    description: 'The application is wrong; keep the test as a documented expected failure.',
    input_schema: { type: 'object', properties: { rationale }, required: ['rationale'], additionalProperties: false },
  },
  {
    name: 'drop_test_case',
    description: 'The case cannot be automated reliably.',
    input_schema: { type: 'object', properties: { rationale }, required: ['rationale'], additionalProperties: false },
  },
];

export async function heal(
  llm: LLMProvider,
  tc: TestCase,
  failure: Extract<ReplayOutcome, { passed: false }>,
  grounding: GroundingIndex,
): Promise<{ decision: HealDecision; usage: Usage }> {
  if (failure.snapshot) grounding.record(failure.snapshot);
  const failing = tc.steps[failure.failedStep];
  const messages: Message[] = [
    {
      role: 'user',
      content: [
        `TEST CASE:\n${JSON.stringify(tc, null, 2)}`,
        `FAILED AT: step ${failure.failedStep + 1} ${JSON.stringify(failing)}`,
        `ERROR:\n${failure.error}`,
        `PAGE AT FAILURE:\n${failure.snapshot ? renderSnapshot(failure.snapshot) : '(unavailable)'}`,
      ].join('\n\n'),
    },
  ];
  let usage: Usage = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0 };

  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await llm.complete({ system: HEALER_SYSTEM_PROMPT, messages, tools: HEALER_TOOLS, toolChoice: 'any', maxTokens: 8000 });
    usage = {
      inputTokens: usage.inputTokens + res.usage.inputTokens,
      outputTokens: usage.outputTokens + res.usage.outputTokens,
      cacheReadTokens: usage.cacheReadTokens + res.usage.cacheReadTokens,
    };
    messages.push({ role: 'assistant', content: res.content });
    const tu = res.content.find((b): b is Extract<ContentBlock, { type: 'tool_use' }> => b.type === 'tool_use');
    if (!tu) {
      messages.push({ role: 'user', content: 'Call exactly one of the tools.' });
      continue;
    }
    const why = String(tu.input.rationale ?? '');
    if (tu.name === 'flag_suspected_defect') return { decision: { kind: 'defect', rationale: why }, usage };
    if (tu.name === 'drop_test_case') return { decision: { kind: 'drop', rationale: why }, usage };

    const tool = HEALER_TOOLS[0]!;
    const errors = validate(tool.input_schema, tu.input);
    const fixed = tu.input.testCase as TestCase | undefined;
    const problems = errors.length
      ? [formatErrors(errors)]
      : fixed!.id !== tc.id
        ? [`id must stay ${tc.id}`]
        : grounding.checkTestCase(fixed!);
    if (problems.length === 0) return { decision: { kind: 'fix', testCase: fixed!, rationale: why }, usage };
    messages.push({
      role: 'user',
      content: [{ type: 'tool_result', tool_use_id: tu.id, is_error: true, content: `Rejected:\n${problems.join('\n')}` }],
    });
  }
  return { decision: { kind: 'drop', rationale: 'Healer could not produce a valid fix.' }, usage };
}
