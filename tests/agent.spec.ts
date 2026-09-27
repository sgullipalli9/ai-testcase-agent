/**
 * Integration tests: the real agent loop, browser, grounding, validation, healing and codegen,
 * driven by recorded (replay) or scripted LLM responses against the bundled demo shop.
 */
import { expect, test } from '@playwright/test';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import demoShop from '../sites/demo-shop.site.js';
import { explore } from '../src/agent/explorer.js';
import { BrowserSession } from '../src/browser/session.js';
import { renderSnapshot, takeSnapshot } from '../src/browser/snapshot.js';
import { ReplayProvider } from '../src/llm/replay.js';
import type { CompletionRequest, CompletionResponse, LLMProvider } from '../src/llm/types.js';
import { generateForModule } from '../src/pipeline.js';

test.describe.configure({ mode: 'serial' });

const mod = (name: string) => demoShop.modules.find((m) => m.name === name)!;
const opts = async () => ({ outDir: await mkdtemp(join(tmpdir(), 'agent-')), validate: true, maxHealAttempts: 2, maxTurns: 20, headed: false });

class ScriptedProvider implements LLMProvider {
  readonly name = 'scripted';
  readonly model = 'scripted';
  readonly requests: CompletionRequest[] = [];
  constructor(private readonly script: CompletionResponse['content'][]) {}
  async complete(req: CompletionRequest): Promise<CompletionResponse> {
    this.requests.push(structuredClone(req));
    const content = this.script.shift();
    if (!content) throw new Error('script exhausted');
    return { content, stopReason: 'tool_use', usage: { inputTokens: 1, outputTokens: 1, cacheReadTokens: 0 } };
  }
}

test('snapshot exposes refs, stable locators and error messages', async () => {
  const session = await BrowserSession.launch(demoShop);
  const { page } = await session.newPage();
  await page.goto('/');
  await page.getByTestId('login-button').click();
  const text = renderSnapshot(await takeSnapshot(page, session.testIdAttribute));
  expect(text).toContain('textbox "Username" | testId=username');
  expect(text).toContain('password "Password" | testId=password');
  expect(text).toContain('alert "Username is required" | testId=login-error');
  await session.close();
});

test('login: replayed session is grounded, validated and one case is healed', async () => {
  const o = await opts();
  const suite = await generateForModule(await ReplayProvider.load('fixtures/replay/demo-shop/login.json'), demoShop, mod('login'), o);
  expect(suite.metrics!.groundingRejections).toBe(1);
  expect(suite.metrics!.statusCounts).toMatchObject({ validated: 7, healed: 1, quarantined: 0 });
  const healed = suite.testCases.find((t) => t.id === 'TC-LOGIN-005')!;
  expect(healed.validation.status).toBe('healed');
  expect(JSON.stringify(healed.steps)).toContain('This account is locked');
  const spec = await readFile(join(o.outDir, 'demo-shop', 'login', 'login.spec.ts'), 'utf8');
  expect(spec).toContain("test('TC-LOGIN-001 Sign in with valid credentials'");
});

test('products: the seeded sorting bug is flagged as a suspected defect', async () => {
  const suite = await generateForModule(await ReplayProvider.load('fixtures/replay/demo-shop/products.json'), demoShop, mod('products'), await opts());
  const tc = suite.testCases.find((t) => t.id === 'TC-PRODUCTS-005')!;
  expect(tc.validation.status).toBe('suspected-defect');
  expect(tc.validation.lastError).toContain('"$49.99","$4.99"');
});

test('agent cannot navigate outside the application under test', async () => {
  const llm = new ScriptedProvider([
    [{ type: 'tool_use', id: 't1', name: 'browser_navigate', input: { path: 'https://evil.example.com/' } }],
    [{ type: 'tool_use', id: 't2', name: 'browser_snapshot', input: {} }],
  ]);
  const session = await BrowserSession.launch(demoShop);
  await expect(explore(llm, session, mod('login'), { maxTurns: 2 })).rejects.toThrow('did not submit');
  await session.close();
  const feedback = JSON.stringify(llm.requests[1]!.messages.at(-1));
  expect(feedback).toContain('Refused: https://evil.example.com/ is outside the application under test');
});

test('schema errors are fed back to the model so it can self-correct', async () => {
  const llm = new ScriptedProvider([
    [{ type: 'tool_use', id: 't1', name: 'submit_test_cases', input: { testCases: [{ id: 'bad' }], coverageSummary: 'x' } }],
    [{ type: 'tool_use', id: 't2', name: 'browser_snapshot', input: {} }],
  ]);
  const session = await BrowserSession.launch(demoShop);
  await expect(explore(llm, session, mod('login'), { maxTurns: 2 })).rejects.toThrow();
  await session.close();
  const feedback = JSON.stringify(llm.requests[1]!.messages.at(-1));
  expect(feedback).toContain('Rejected — schema errors');
  expect(feedback).toContain('$.testCases[0].id must match');
  expect(feedback).toContain('"is_error":true');
});
