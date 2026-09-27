/**
 * Replays a test case in a fresh browser context using exactly the same step semantics as the
 * generated spec (src/steps/actions.ts). A test case is only shipped as "validated" if it passes here.
 */
import type { BrowserSession } from '../browser/session.js';
import { takeSnapshot, type PageSnapshot } from '../browser/snapshot.js';
import type { ModuleConfig } from '../config.js';
import type { TestCase } from '../model/testCase.js';
import { execStep } from '../steps/actions.js';

export type ReplayOutcome =
  | { passed: true; durationMs: number }
  | { passed: false; durationMs: number; failedStep: number; error: string; snapshot?: PageSnapshot; phase: 'auth' | 'test' };

const firstLines = (s: string, n = 12) =>
  s
    .replace(/\x1b\[[0-9;]*m/g, '')
    .split('\n')
    .filter((l) => l.trim())
    .slice(0, n)
    .join('\n');

export async function replayTestCase(session: BrowserSession, mod: ModuleConfig, tc: TestCase, stepTimeout = 5000): Promise<ReplayOutcome> {
  const started = Date.now();
  const { context, page } = await session.newPage();
  try {
    if (mod.requiresAuth) {
      try {
        await session.authenticate(page);
      } catch (err) {
        return { passed: false, durationMs: Date.now() - started, failedStep: -1, error: firstLines(String((err as Error).message)), phase: 'auth' };
      }
    }
    for (let i = 0; i < tc.steps.length; i++) {
      try {
        await execStep(page, tc.steps[i]!, stepTimeout);
      } catch (err) {
        const snapshot = await takeSnapshot(page, session.testIdAttribute).catch(() => undefined);
        return {
          passed: false,
          durationMs: Date.now() - started,
          failedStep: i,
          error: firstLines((err as Error).message ?? String(err)),
          snapshot,
          phase: 'test',
        };
      }
    }
    return { passed: true, durationMs: Date.now() - started };
  } finally {
    await context.close();
  }
}
