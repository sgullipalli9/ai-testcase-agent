import { expect, test } from '@playwright/test';
import { GroundingIndex } from '../src/agent/grounding.js';
import type { PageSnapshot } from '../src/browser/snapshot.js';
import { testCaseSchema } from '../src/model/schema.js';
import type { TestCase } from '../src/model/testCase.js';
import { validate } from '../src/model/validate.js';

const valid: TestCase = {
  id: 'TC-LOGIN-001',
  title: 'Sign in',
  objective: 'Happy path',
  type: 'functional',
  priority: 'P0',
  tags: ['smoke'],
  preconditions: [],
  steps: [
    { action: 'goto', path: '/' },
    { action: 'fill', target: { testId: 'username' }, value: 'demo' },
    { action: 'expectText', target: { role: 'alert' }, text: 'ok' },
  ],
  expectedResult: 'Logged in',
};

test.describe('schema validation', () => {
  test('accepts a well-formed test case', () => {
    expect(validate(testCaseSchema, valid)).toEqual([]);
  });

  test('reports the precise problem inside a discriminated step', () => {
    const bad = structuredClone(valid) as unknown as { steps: Record<string, unknown>[] };
    bad.steps[1] = { action: 'fill', target: { testId: 'username' } }; // missing value
    const errors = validate(testCaseSchema, bad);
    expect(errors).toEqual([{ path: '$.steps[1].value', message: 'is required' }]);
  });

  test('rejects unknown actions, bad ids and extra properties', () => {
    const bad = { ...valid, id: 'login-1', extra: true, steps: [{ action: 'hover', target: { css: 'a' } }, valid.steps[0]] };
    const messages = validate(testCaseSchema, bad).map((e) => `${e.path} ${e.message}`);
    expect(messages).toContain('$.id must match /^TC-[A-Z0-9]+-\\d{3}$/');
    expect(messages).toContain('$.extra is not an allowed property');
    expect(messages.some((m) => m.startsWith('$.steps[0].action must be one of goto, click, fill'))).toBe(true);
  });
});

test.describe('grounding', () => {
  const snapshot: PageSnapshot = {
    url: 'http://localhost/login',
    title: 'Login',
    text: 'Sign in\nUsername is required',
    elements: [
      { ref: 'e1', role: 'textbox', name: 'Username', tag: 'input', testId: 'username', testIdCount: 1, css: '#u' },
      { ref: 'e2', role: 'button', name: 'Sign in', tag: 'button', testIdCount: 0, css: 'button' },
      {
        ref: 'e3', role: 'combobox', name: 'Sort', tag: 'select', testId: 'sort', testIdCount: 1, css: 'select',
        options: [{ value: 'az', label: 'Name (A to Z)' }],
      },
    ],
  };
  const g = new GroundingIndex();
  g.record(snapshot);

  test('accepts observed locators', () => {
    expect(g.checkTarget({ testId: 'username' })).toBeNull();
    expect(g.checkTarget({ role: 'button', name: 'sign in' })).toBeNull();
    expect(g.checkTarget({ text: 'username is required' })).toBeNull();
    expect(g.checkStep({ action: 'select', target: { testId: 'sort' }, value: 'Name (A to Z)' })).toBeNull();
  });

  test('rejects hallucinated locators with a reason', () => {
    expect(g.checkTarget({ testId: 'welcome-banner' })).toBe('testId "welcome-banner" was never observed');
    expect(g.checkTarget({ role: 'link', name: 'Forgot password' })).toContain('no link named');
    expect(g.checkStep({ action: 'select', target: { testId: 'sort' }, value: 'price' })).toContain('option "price"');
  });
});
