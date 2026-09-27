import type { Locator, Page } from '@playwright/test';
import type { Target } from '../model/testCase.js';

/** Resolve a Target to a live Playwright Locator. */
export function resolveTarget(page: Page, t: Target): Locator {
  let loc: Locator;
  if ('testId' in t) loc = page.getByTestId(t.testId);
  else if ('role' in t)
    loc = page.getByRole(t.role as Parameters<Page['getByRole']>[0], t.name !== undefined ? { name: t.name, exact: t.exact ?? true } : {});
  else if ('label' in t) loc = page.getByLabel(t.label, { exact: t.exact ?? true });
  else if ('placeholder' in t) loc = page.getByPlaceholder(t.placeholder);
  else if ('text' in t) loc = page.getByText(t.text, { exact: t.exact ?? false });
  else loc = page.locator(t.css);
  return t.nth !== undefined ? loc.nth(t.nth) : loc;
}

export const q = (s: string): string => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n')}'`;

/** Emit the equivalent Playwright source code. Must stay in lock-step with resolveTarget(). */
export function emitTarget(t: Target): string {
  let code: string;
  if ('testId' in t) code = `page.getByTestId(${q(t.testId)})`;
  else if ('role' in t)
    code = t.name !== undefined ? `page.getByRole(${q(t.role)}, { name: ${q(t.name)}, exact: ${t.exact ?? true} })` : `page.getByRole(${q(t.role)})`;
  else if ('label' in t) code = `page.getByLabel(${q(t.label)}, { exact: ${t.exact ?? true} })`;
  else if ('placeholder' in t) code = `page.getByPlaceholder(${q(t.placeholder)})`;
  else if ('text' in t) code = `page.getByText(${q(t.text)}, { exact: ${t.exact ?? false} })`;
  else code = `page.locator(${q(t.css)})`;
  return t.nth !== undefined ? `${code}.nth(${t.nth})` : code;
}

/** Human description of an element for manual test steps. */
export function describeTarget(t: Target): string {
  if ('testId' in t) return `[${t.testId}]${t.nth !== undefined ? ` #${t.nth + 1}` : ''}`;
  if ('role' in t) return t.name ? `the "${t.name}" ${t.role}` : `the ${t.role}`;
  if ('label' in t) return `the "${t.label}" field`;
  if ('placeholder' in t) return `the "${t.placeholder}" field`;
  if ('text' in t) return `"${t.text}"`;
  return `\`${t.css}\``;
}
