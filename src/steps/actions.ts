/**
 * Single source of truth for every DSL action:
 *   exec    -> performs it in a live browser (used for validation / healing)
 *   emit    -> Playwright source for the generated spec
 *   narrate -> wording for the manual test case
 * Because `Record<StepAction, ...>` must be exhaustive, adding an action without all three
 * implementations is a compile error.
 */
import { expect, type Page } from '@playwright/test';
import type { Step, StepAction } from '../model/testCase.js';
import { describeTarget, emitTarget, q, resolveTarget } from './target.js';

type StepOf<A extends StepAction> = Extract<Step, { action: A }>;

interface ActionDef<A extends StepAction> {
  kind: 'action' | 'assertion';
  exec(page: Page, step: StepOf<A>, opts: { timeout: number }): Promise<void>;
  emit(step: StepOf<A>): string;
  narrate(step: StepOf<A>): string;
}

type ActionTable = { [A in StepAction]: ActionDef<A> };

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function parseNumber(text: string): number {
  return Number(text.replace(/[^0-9.-]/g, ''));
}

export function isSorted(values: string[], order: 'asc' | 'desc', by: 'text' | 'number'): boolean {
  const cmp = (a: string, b: string) => (by === 'number' ? parseNumber(a) - parseNumber(b) : a.localeCompare(b));
  return values.every((v, i) => i === 0 || (order === 'asc' ? cmp(values[i - 1]!, v) <= 0 : cmp(values[i - 1]!, v) >= 0));
}

export const actions: ActionTable = {
  goto: {
    kind: 'action',
    exec: async (page, s) => void (await page.goto(s.path)),
    emit: (s) => `await page.goto(${q(s.path)});`,
    narrate: (s) => `Open ${s.path}`,
  },
  click: {
    kind: 'action',
    exec: (page, s, o) => resolveTarget(page, s.target).click({ timeout: o.timeout }),
    emit: (s) => `await ${emitTarget(s.target)}.click();`,
    narrate: (s) => `Click ${describeTarget(s.target)}`,
  },
  fill: {
    kind: 'action',
    exec: (page, s, o) => resolveTarget(page, s.target).fill(s.value, { timeout: o.timeout }),
    emit: (s) => `await ${emitTarget(s.target)}.fill(${q(s.value)});`,
    narrate: (s) => (s.value === '' ? `Leave ${describeTarget(s.target)} empty` : `Enter "${s.value}" in ${describeTarget(s.target)}`),
  },
  select: {
    kind: 'action',
    exec: async (page, s, o) => void (await resolveTarget(page, s.target).selectOption(s.value, { timeout: o.timeout })),
    emit: (s) => `await ${emitTarget(s.target)}.selectOption(${q(s.value)});`,
    narrate: (s) => `Select "${s.value}" in ${describeTarget(s.target)}`,
  },
  press: {
    kind: 'action',
    exec: (page, s, o) => resolveTarget(page, s.target).press(s.key, { timeout: o.timeout }),
    emit: (s) => `await ${emitTarget(s.target)}.press(${q(s.key)});`,
    narrate: (s) => `Press ${s.key} in ${describeTarget(s.target)}`,
  },
  check: {
    kind: 'action',
    exec: (page, s, o) => resolveTarget(page, s.target).check({ timeout: o.timeout }),
    emit: (s) => `await ${emitTarget(s.target)}.check();`,
    narrate: (s) => `Check ${describeTarget(s.target)}`,
  },
  expectVisible: {
    kind: 'assertion',
    exec: (page, s, o) => expect(resolveTarget(page, s.target)).toBeVisible({ timeout: o.timeout }),
    emit: (s) => `await expect(${emitTarget(s.target)}).toBeVisible();`,
    narrate: (s) => `${describeTarget(s.target)} is visible`,
  },
  expectHidden: {
    kind: 'assertion',
    exec: (page, s, o) => expect(resolveTarget(page, s.target)).toBeHidden({ timeout: o.timeout }),
    emit: (s) => `await expect(${emitTarget(s.target)}).toBeHidden();`,
    narrate: (s) => `${describeTarget(s.target)} is not displayed`,
  },
  expectText: {
    kind: 'assertion',
    exec: (page, s, o) =>
      s.exact
        ? expect(resolveTarget(page, s.target)).toHaveText(s.text, { timeout: o.timeout })
        : expect(resolveTarget(page, s.target)).toContainText(s.text, { timeout: o.timeout }),
    emit: (s) => `await expect(${emitTarget(s.target)}).${s.exact ? 'toHaveText' : 'toContainText'}(${q(s.text)});`,
    narrate: (s) => `${describeTarget(s.target)} ${s.exact ? 'reads' : 'contains'} "${s.text}"`,
  },
  expectValue: {
    kind: 'assertion',
    exec: (page, s, o) => expect(resolveTarget(page, s.target)).toHaveValue(s.value, { timeout: o.timeout }),
    emit: (s) => `await expect(${emitTarget(s.target)}).toHaveValue(${q(s.value)});`,
    narrate: (s) => `${describeTarget(s.target)} has value "${s.value}"`,
  },
  expectCount: {
    kind: 'assertion',
    exec: (page, s, o) => expect(resolveTarget(page, s.target)).toHaveCount(s.count, { timeout: o.timeout }),
    emit: (s) => `await expect(${emitTarget(s.target)}).toHaveCount(${s.count});`,
    narrate: (s) => `${s.count} × ${describeTarget(s.target)} are shown`,
  },
  expectUrl: {
    kind: 'assertion',
    exec: (page, s, o) => expect(page).toHaveURL(new RegExp(escapeRegex(s.contains)), { timeout: o.timeout }),
    emit: (s) => `await expect(page).toHaveURL(/${escapeRegex(s.contains).replace(/\//g, '\\/')}/);`,
    narrate: (s) => `The URL contains "${s.contains}"`,
  },
  expectSorted: {
    kind: 'assertion',
    exec: async (page, s, o) => {
      await expect(resolveTarget(page, s.target).first()).toBeVisible({ timeout: o.timeout });
      const values = await resolveTarget(page, s.target).allInnerTexts();
      if (!isSorted(values, s.order, s.by)) {
        throw new Error(`Expected ${describeTarget(s.target)} sorted ${s.by} ${s.order}, got: ${JSON.stringify(values)}`);
      }
    },
    emit: (s) =>
      [
        `await expect(${emitTarget(s.target)}.first()).toBeVisible();`,
        `expect(isSorted(await ${emitTarget(s.target)}.allInnerTexts(), ${q(s.order)}, ${q(s.by)})).toBe(true);`,
      ].join('\n'),
    narrate: (s) => `${describeTarget(s.target)} are sorted by ${s.by === 'number' ? 'value' : 'name'} (${s.order === 'asc' ? 'ascending' : 'descending'})`,
  },
};

/** Run one step against a live page (type-safe dispatch). */
export function execStep(page: Page, step: Step, timeout = 5000): Promise<void> {
  const def = actions[step.action] as ActionDef<StepAction>;
  return def.exec(page, step as never, { timeout });
}

export function emitStep(step: Step): string {
  return (actions[step.action] as ActionDef<StepAction>).emit(step as never);
}

export function narrateStep(step: Step): string {
  const text = step.note ?? (actions[step.action] as ActionDef<StepAction>).narrate(step as never);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function isAssertion(step: Step): boolean {
  return actions[step.action].kind === 'assertion';
}
