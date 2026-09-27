/**
 * The explorer agent: a ReAct-style tool-use loop.
 * Claude observes the page (snapshot), acts (click/fill/select/navigate), and finally submits a
 * test design that is schema- and grounding-checked before it is accepted.
 */
import type { BrowserSession } from '../browser/session.js';
import type { ModuleConfig } from '../config.js';
import type { ContentBlock, LLMProvider, Message, Usage } from '../llm/types.js';
import type { TestCase } from '../model/testCase.js';
import { log } from '../util/log.js';
import type { GroundingIndex } from './grounding.js';
import { explorerKickoff, explorerSystemPrompt } from './prompts.js';
import { EXPLORER_TOOLS, ExplorerToolbox } from './tools.js';

export interface ExplorationResult {
  testCases: TestCase[];
  coverageSummary: string;
  turns: number;
  toolCalls: number;
  groundingRejections: number;
  usage: Usage;
  /** Everything observed during exploration; reused by the healer's grounding check. */
  grounding: GroundingIndex;
}

export interface ExplorerOptions {
  maxTurns?: number;
  /** Keep only the N most recent snapshots verbatim in the context window. */
  keepSnapshots?: number;
}

export function addUsage(a: Usage, b: Usage): Usage {
  return { inputTokens: a.inputTokens + b.inputTokens, outputTokens: a.outputTokens + b.outputTokens, cacheReadTokens: a.cacheReadTokens + b.cacheReadTokens };
}

/** Context-window hygiene: old snapshots are replaced by a one-line stub. */
function elideOldSnapshots(messages: Message[], keep: number): void {
  const results = messages.flatMap((m) =>
    Array.isArray(m.content) ? m.content.filter((b): b is Extract<ContentBlock, { type: 'tool_result' }> => b.type === 'tool_result') : [],
  );
  for (const r of results.slice(0, Math.max(0, results.length - keep))) {
    if (r.content.includes('ELEMENTS (') && !r.content.startsWith('[elided')) {
      const header = r.content.split('\n').find((l) => l.startsWith('PAGE:')) ?? '';
      r.content = `[elided old snapshot] ${header}`;
    }
  }
}

export async function explore(
  llm: LLMProvider,
  session: BrowserSession,
  mod: ModuleConfig,
  opts: ExplorerOptions = {},
): Promise<ExplorationResult> {
  const maxTurns = opts.maxTurns ?? 40;
  const toolbox = new ExplorerToolbox(session, mod);
  await toolbox.start();

  const system = explorerSystemPrompt(session.site, mod);
  const messages: Message[] = [{ role: 'user', content: explorerKickoff(mod) }];
  let usage: Usage = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0 };
  let toolCalls = 0;

  try {
    for (let turn = 1; turn <= maxTurns; turn++) {
      elideOldSnapshots(messages, opts.keepSnapshots ?? 4);
      const res = await llm.complete({ system, messages, tools: EXPLORER_TOOLS, maxTokens: 16_000 });
      usage = addUsage(usage, res.usage);
      messages.push({ role: 'assistant', content: res.content });

      for (const b of res.content) if (b.type === 'text' && b.text.trim()) log.debug(`claude: ${b.text.trim().slice(0, 300)}`);

      const toolUses = res.content.filter((b): b is Extract<ContentBlock, { type: 'tool_use' }> => b.type === 'tool_use');
      if (toolUses.length === 0) {
        const nudge =
          res.stopReason === 'max_tokens'
            ? 'Your response was cut off (max tokens). Submit fewer or more concise test cases.'
            : 'Continue using the tools. Finish by calling submit_test_cases.';
        messages.push({ role: 'user', content: nudge });
        continue;
      }

      const results: ContentBlock[] = [];
      let accepted: ExplorationResult | undefined;
      for (const tu of toolUses) {
        toolCalls++;
        log.info(`turn ${turn}: ${tu.name}${tu.name.startsWith('browser_') && Object.keys(tu.input).length ? ` ${JSON.stringify(tu.input)}` : ''}`);
        const r = await toolbox.run(tu.name, tu.input);
        if (r.isError) log.warn(r.content.split('\n').slice(0, 4).join(' | '));
        let content = r.content;
        if (turn >= maxTurns - 3 && !r.submission) content += `\n\n[Budget: ${maxTurns - turn} turns left — submit_test_cases now.]`;
        results.push({ type: 'tool_result', tool_use_id: tu.id, content, ...(r.isError ? { is_error: true } : {}) });
        if (r.submission) {
          accepted = {
            ...r.submission,
            turns: turn,
            toolCalls,
            groundingRejections: toolbox.groundingRejections,
            usage,
            grounding: toolbox.grounding,
          };
        }
      }
      messages.push({ role: 'user', content: results });
      if (accepted) {
        log.ok(`Agent submitted ${accepted.testCases.length} test cases after ${turn} turns`);
        return accepted;
      }
    }
    throw new Error(`Agent did not submit test cases within ${maxTurns} turns`);
  } finally {
    await toolbox.dispose();
  }
}
