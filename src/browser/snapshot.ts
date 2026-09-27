/**
 * Page snapshot: a compact, token-efficient model of what a tester can see and interact with.
 * Each element gets a short ref (e1, e2, ...) the agent uses to act, plus the *best stable locator*
 * (testId > role+name > label > placeholder > css) that the agent must reuse in its test cases.
 */
import type { Page } from '@playwright/test';
import type { Target } from '../model/testCase.js';

export interface SnapshotElement {
  ref: string;
  role: string;
  name: string;
  tag: string;
  testId?: string;
  testIdCount: number;
  inputType?: string;
  placeholder?: string;
  label?: string;
  value?: string;
  options?: { value: string; label: string }[];
  href?: string;
  disabled?: boolean;
  css: string;
  locator?: Target;
}

export interface PageSnapshot {
  url: string;
  title: string;
  elements: SnapshotElement[];
  /** Visible text sample, for text-based assertions (messages, headings, totals). */
  text: string;
}

/** Runs inside the browser. Must be self-contained (no closures over Node variables). */
function collect(args: { testIdAttr: string; max: number }) {
  const { testIdAttr, max } = args;
  const clean = (s: string | null | undefined) => (s ?? '').replace(/\s+/g, ' ').trim().slice(0, 80);
  const isVisible = (el: Element) => {
    const r = el.getBoundingClientRect();
    const st = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && st.visibility !== 'hidden' && st.display !== 'none';
  };
  const implicitRole = (el: Element): string => {
    const explicit = el.getAttribute('role');
    if (explicit) return explicit;
    const tag = el.tagName.toLowerCase();
    const type = (el.getAttribute('type') ?? 'text').toLowerCase();
    if (tag === 'a' && el.hasAttribute('href')) return 'link';
    if (tag === 'button') return 'button';
    if (tag === 'select') return (el as HTMLSelectElement).multiple ? 'listbox' : 'combobox';
    if (tag === 'textarea') return 'textbox';
    if (/^h[1-6]$/.test(tag)) return 'heading';
    if (tag === 'img') return 'img';
    if (tag === 'input') {
      if (['button', 'submit', 'reset', 'image'].includes(type)) return 'button';
      if (type === 'checkbox' || type === 'radio') return type;
      if (type === 'password') return 'password'; // no ARIA role: getByRole cannot target it
      if (['text', 'email', 'tel', 'url', 'search', 'number'].includes(type)) return type === 'number' ? 'spinbutton' : 'textbox';
    }
    return 'text';
  };
  const labelOf = (el: Element): string => {
    const id = el.getAttribute('id');
    const byFor = id ? document.querySelector(`label[for="${CSS.escape(id)}"]`) : null;
    return clean(byFor?.textContent ?? el.closest('label')?.textContent);
  };
  const nameOf = (el: Element, role: string): string => {
    const aria = el.getAttribute('aria-label');
    if (aria) return clean(aria);
    const lb = el.getAttribute('aria-labelledby');
    if (lb) return clean(lb.split(' ').map((i) => document.getElementById(i)?.textContent).join(' '));
    const label = labelOf(el);
    if (label) return label;
    if (el instanceof HTMLInputElement && ['submit', 'button', 'reset'].includes(el.type)) return clean(el.value);
    if (['button', 'link', 'heading', 'text', 'alert'].includes(role)) return clean((el as HTMLElement).innerText);
    return clean(el.getAttribute('alt') ?? el.getAttribute('title') ?? el.getAttribute('placeholder'));
  };
  const cssPath = (el: Element): string => {
    if (el.id) return `#${CSS.escape(el.id)}`;
    const parts: string[] = [];
    let cur: Element | null = el;
    while (cur && cur !== document.body && parts.length < 4) {
      const tag = cur.tagName.toLowerCase();
      const parent: Element | null = cur.parentElement;
      const same = parent ? Array.from(parent.children).filter((c) => c.tagName === cur!.tagName) : [];
      parts.unshift(same.length > 1 ? `${tag}:nth-of-type(${same.indexOf(cur) + 1})` : tag);
      if (cur.id) { parts[0] = `#${CSS.escape(cur.id)}`; break; }
      cur = parent;
    }
    return parts.join(' > ');
  };

  const selector = [
    'a[href]', 'button', 'input:not([type=hidden])', 'select', 'textarea', 'h1', 'h2', 'h3',
    '[role]', `[${testIdAttr}]`, '[onclick]', '[tabindex]:not([tabindex="-1"])',
  ].join(',');
  document.querySelectorAll('[data-agent-ref]').forEach((e) => e.removeAttribute('data-agent-ref'));

  const out: Record<string, unknown>[] = [];
  let i = 0;
  for (const el of Array.from(document.querySelectorAll(selector))) {
    if (out.length >= max) break;
    if (!isVisible(el)) continue;
    const role = implicitRole(el);
    const testId = el.getAttribute(testIdAttr) ?? undefined;
    // Pure containers with a testId but no own text are noise, unless interactive.
    if (role === 'text' && !testId) continue;
    // Containers (a testId element wrapping other elements) are listed without their full text.
    const isContainer = role === 'text' && el.querySelector(selector) !== null;
    const name = isContainer ? `(container of ${el.children.length})` : nameOf(el, role);
    const ref = `e${++i}`;
    el.setAttribute('data-agent-ref', ref);
    const input = el as HTMLInputElement;
    out.push({
      ref,
      role,
      name,
      tag: el.tagName.toLowerCase(),
      testId,
      testIdCount: testId ? document.querySelectorAll(`[${testIdAttr}="${CSS.escape(testId)}"]`).length : 0,
      inputType: el.tagName === 'INPUT' ? input.type : undefined,
      placeholder: el.getAttribute('placeholder') ?? undefined,
      label: labelOf(el) || undefined,
      value: el.tagName === 'INPUT' && input.type !== 'password' ? input.value || undefined : undefined,
      options: el instanceof HTMLSelectElement ? Array.from(el.options).map((o) => ({ value: o.value, label: clean(o.textContent) })) : undefined,
      href: el.getAttribute('href') ?? undefined,
      disabled: (el as HTMLButtonElement).disabled || el.getAttribute('aria-disabled') === 'true' || undefined,
      css: cssPath(el),
    });
  }
  return {
    url: location.href,
    title: document.title,
    elements: out,
    text: (document.body?.innerText ?? '').replace(/\n{2,}/g, '\n').slice(0, 1500),
  };
}

const ROLE_LOCATABLE = new Set(['button', 'link', 'textbox', 'checkbox', 'radio', 'combobox', 'listbox', 'heading', 'spinbutton', 'img', 'alert']);

export async function takeSnapshot(page: Page, testIdAttr: string, max = 120): Promise<PageSnapshot> {
  await page.waitForLoadState('domcontentloaded');
  const raw = (await page.evaluate(collect, { testIdAttr, max })) as unknown as PageSnapshot;
  for (const el of raw.elements) el.locator = await bestLocator(page, el);
  return raw;
}

async function bestLocator(page: Page, el: SnapshotElement): Promise<Target> {
  // Non-unique testIds are still returned: ideal for expectCount/expectSorted, or combined with nth.
  if (el.testId) return { testId: el.testId };
  if (ROLE_LOCATABLE.has(el.role) && el.name) {
    const n = await page.getByRole(el.role as 'button', { name: el.name, exact: true }).count();
    if (n === 1) return { role: el.role, name: el.name };
  }
  if (el.label && (await page.getByLabel(el.label, { exact: true }).count()) === 1) return { label: el.label };
  if (el.placeholder && (await page.getByPlaceholder(el.placeholder).count()) === 1) return { placeholder: el.placeholder };
  return { css: el.css };
}

export function locatorToString(t: Target): string {
  if ('testId' in t) return `testId=${t.testId}`;
  if ('role' in t) return `role=${t.role}${t.name ? ` name="${t.name}"` : ''}`;
  if ('label' in t) return `label="${t.label}"`;
  if ('placeholder' in t) return `placeholder="${t.placeholder}"`;
  if ('text' in t) return `text="${t.text}"`;
  return `css=${t.css}`;
}

/** Compact text rendering sent to the LLM. Repeated testIds are collapsed to save tokens. */
export function renderSnapshot(s: PageSnapshot): string {
  const lines = [`PAGE: ${s.title} — ${s.url}`, 'ELEMENTS (ref | role "name" | locator to use | details):'];
  const seenRepeated = new Map<string, number>();
  for (const el of s.elements) {
    if (el.testId && el.testIdCount > 1) {
      const seen = seenRepeated.get(el.testId) ?? 0;
      seenRepeated.set(el.testId, seen + 1);
      if (seen >= 2) continue; // show first two examples only
    }
    const details = [
      el.testIdCount > 1 ? `${el.testIdCount} matches` : '',
      el.inputType && el.inputType !== 'text' ? `type=${el.inputType}` : '',
      el.placeholder ? `placeholder="${el.placeholder}"` : '',
      el.value ? `value="${el.value}"` : '',
      el.href ? `href=${el.href}` : '',
      el.disabled ? 'disabled' : '',
      el.options ? `options=[${el.options.map((o) => `${o.value}:${o.label}`).join(', ')}]` : '',
    ].filter(Boolean);
    lines.push(`${el.ref} | ${el.role} "${el.name}" | ${el.locator ? locatorToString(el.locator) : ''}${details.length ? ` | ${details.join(' ')}` : ''}`);
  }
  lines.push('VISIBLE TEXT:', s.text);
  return lines.join('\n');
}
