import { expect, test } from '@playwright/test';
import demoShop from '../sites/demo-shop.site.js';
import { generateCsv, manualSteps } from '../src/generators/docs.js';
import { generateSpec } from '../src/generators/playwright.js';
import type { TestSuite, ValidatedTestCase } from '../src/model/testCase.js';
import { emitStep, isSorted, narrateStep } from '../src/steps/actions.js';
import { emitTarget } from '../src/steps/target.js';

const tc = (status: ValidatedTestCase['validation']['status']): ValidatedTestCase => ({
  id: 'TC-PRODUCTS-001',
  title: "Sort by price — it's numeric",
  objective: 'Numeric sort',
  type: 'functional',
  priority: 'P1',
  tags: ['sorting'],
  preconditions: [],
  steps: [
    { action: 'goto', path: '/products.html' },
    { action: 'select', target: { testId: 'sort' }, value: 'price-asc' },
    { action: 'expectSorted', target: { testId: 'product-price' }, order: 'asc', by: 'number' },
  ],
  expectedResult: 'Cheapest first',
  validation: { status, attempts: 1, rationale: 'because' },
});

const suite = (status: ValidatedTestCase['validation']['status']): TestSuite => ({
  site: 'demo-shop',
  module: 'products',
  generatedAt: '2026-01-01T00:00:00Z',
  generator: { model: 'test', provider: 'test' },
  coverageSummary: 'x',
  testCases: [tc(status)],
});

test('emits the recommended Playwright locator for each strategy', () => {
  expect(emitTarget({ testId: 'a' })).toBe("page.getByTestId('a')");
  expect(emitTarget({ role: 'button', name: "Don't" })).toBe("page.getByRole('button', { name: 'Don\\'t', exact: true })");
  expect(emitTarget({ label: 'Email', nth: 1 })).toBe("page.getByLabel('Email', { exact: true }).nth(1)");
  expect(emitTarget({ css: '.x' })).toBe("page.locator('.x')");
});

test('emits web-first assertions and regex-safe URL checks', () => {
  expect(emitStep({ action: 'expectUrl', contains: '/cart.html?x=1' })).toBe('await expect(page).toHaveURL(/\\/cart\\.html\\?x=1/);');
  expect(emitStep({ action: 'expectText', target: { testId: 'e' }, text: 'Hi', exact: true })).toBe("await expect(page.getByTestId('e')).toHaveText('Hi');");
});

test('isSorted compares numbers numerically, not as strings', () => {
  expect(isSorted(['$4.99', '$12.50', '$49.99'], 'asc', 'number')).toBe(true);
  expect(isSorted(['$49.99', '$4.99', '$34.00'], 'desc', 'number')).toBe(false);
  expect(isSorted(['b', 'a'], 'desc', 'text')).toBe(true);
});

test('spec marks suspected defects as expected failures and quarantined cases as fixme', () => {
  const defect = generateSpec(demoShop, suite('suspected-defect'), true);
  expect(defect).toContain('test.fail();');
  expect(defect).toContain("type: 'suspected-defect'");
  expect(defect).toContain('function isSorted');
  expect(defect).toContain('test.beforeEach');
  expect(generateSpec(demoShop, suite('quarantined'), true)).toContain("test.fixme('TC-PRODUCTS-001");
  expect(generateSpec(demoShop, suite('validated'), false)).not.toContain('beforeEach');
});

test('manual steps pair actions with their expected results', () => {
  const rows = manualSteps(tc('validated'));
  expect(rows).toEqual([
    { action: 'Open /products.html', expected: '' },
    { action: 'Select "price-asc" in [sort]', expected: '[product-price] are sorted by value (ascending)' },
  ]);
  expect(narrateStep({ action: 'fill', target: { label: 'Zip' }, value: '' })).toBe('Leave the "Zip" field empty');
});

test('CSV escapes quotes and keeps one row per case', () => {
  const csv = generateCsv(suite('validated'));
  expect(csv.split('\n')[0]).toContain('"Automation Status"');
  expect(csv).toContain('"Sort by price — it\'s numeric"');
  expect(csv).toContain('Select ""price-asc"" in [sort]');
});
