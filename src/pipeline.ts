/**
 * End-to-end pipeline for one module:
 *   explore (agent) -> validate each case in a real browser -> heal failures -> write outputs.
 */
import { explore, addUsage } from './agent/explorer.js';
import { BrowserSession } from './browser/session.js';
import type { ModuleConfig, SiteConfig } from './config.js';
import { writeSuite } from './generators/writeOutputs.js';
import type { LLMProvider } from './llm/types.js';
import type { RunMetrics, TestCase, TestSuite, ValidatedTestCase, ValidationStatus } from './model/testCase.js';
import { log } from './util/log.js';
import { heal } from './validate/healer.js';
import { replayTestCase } from './validate/replayer.js';

export interface PipelineOptions {
  outDir: string;
  validate: boolean;
  maxHealAttempts: number;
  maxTurns: number;
  headed: boolean;
}

export async function generateForModule(llm: LLMProvider, site: SiteConfig, mod: ModuleConfig, opts: PipelineOptions): Promise<TestSuite> {
  const started = Date.now();
  const session = await BrowserSession.launch(site, { headed: opts.headed });
  try {
    log.step(`[${site.name}/${mod.name}] exploring with ${llm.model}`);
    const exploration = await explore(llm, session, mod, { maxTurns: opts.maxTurns });
    let usage = exploration.usage;

    const results: ValidatedTestCase[] = [];
    if (!opts.validate) {
      results.push(...exploration.testCases.map((tc) => ({ ...tc, validation: { status: 'not-validated' as const, attempts: 0 } })));
    } else {
      log.step(`[${site.name}/${mod.name}] validating ${exploration.testCases.length} test cases in the browser`);
      for (const original of exploration.testCases) {
        let tc: TestCase = original;
        let status: ValidationStatus | undefined;
        let lastError: string | undefined;
        let rationale: string | undefined;
        let attempts = 0;
        while (!status) {
          attempts++;
          const outcome = await replayTestCase(session, mod, tc);
          if (outcome.passed) {
            status = attempts === 1 ? 'validated' : 'healed';
            log.ok(`${tc.id} ${status} (${outcome.durationMs}ms)`);
            break;
          }
          lastError = outcome.error;
          if (outcome.phase === 'auth') throw new Error(`Auth steps failed for ${site.name}; fix site config.\n${outcome.error}`);
          log.warn(`${tc.id} failed at step ${outcome.failedStep + 1}: ${outcome.error.split('\n')[0]}`);
          if (attempts > opts.maxHealAttempts) {
            status = 'quarantined';
            rationale = `Still failing after ${opts.maxHealAttempts} heal attempt(s).`;
            break;
          }
          const { decision, usage: u } = await heal(llm, tc, outcome, exploration.grounding);
          usage = addUsage(usage, u);
          log.info(`${tc.id} healer decision: ${decision.kind} — ${decision.rationale}`);
          if (decision.kind === 'fix') {
            tc = decision.testCase;
            rationale = decision.rationale;
          } else if (decision.kind === 'defect') {
            status = 'suspected-defect';
            rationale = decision.rationale;
          } else {
            status = 'quarantined';
            rationale = `Dropped by healer: ${decision.rationale}`;
          }
        }
        if (status === 'quarantined' && rationale?.startsWith('Dropped')) {
          log.warn(`${tc.id} dropped`);
          continue;
        }
        results.push({ ...tc, validation: { status: status!, attempts, ...(lastError && status !== 'validated' ? { lastError } : {}), ...(rationale ? { rationale } : {}) } });
      }
    }

    const statusCounts = { validated: 0, healed: 0, 'suspected-defect': 0, quarantined: 0, 'not-validated': 0 } as RunMetrics['statusCounts'];
    results.forEach((r) => statusCounts[r.validation.status]++);
    const suite: TestSuite = {
      site: site.name,
      module: mod.name,
      generatedAt: new Date().toISOString(),
      generator: { model: llm.model, provider: llm.name },
      coverageSummary: exploration.coverageSummary,
      testCases: results,
      metrics: {
        agentTurns: exploration.turns,
        toolCalls: exploration.toolCalls,
        groundingRejections: exploration.groundingRejections,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        cacheReadTokens: usage.cacheReadTokens,
        durationMs: Date.now() - started,
        statusCounts,
      },
    };
    const dir = await writeSuite(opts.outDir, site, suite);
    log.ok(`[${site.name}/${mod.name}] wrote ${results.length} test cases to ${dir}`);
    return suite;
  } finally {
    await session.close();
  }
}
