/**
 * Grounding = anti-hallucination guardrail.
 * Every locator in a submitted test case must refer to something the agent actually observed
 * in a page snapshot during exploration. Ungrounded locators are rejected back to the model
 * with a precise reason, before we spend any time replaying them in the browser.
 */
import type { PageSnapshot } from '../browser/snapshot.js';
import type { Step, Target, TestCase } from '../model/testCase.js';

const norm = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase();

export class GroundingIndex {
  private testIds = new Set<string>();
  private roles = new Set<string>();
  private roleNames = new Set<string>();
  private labels = new Set<string>();
  private placeholders = new Set<string>();
  private optionValues = new Set<string>();
  private corpus: string[] = [];
  pagesSeen = new Set<string>();

  record(s: PageSnapshot): void {
    this.pagesSeen.add(new URL(s.url).pathname);
    this.corpus.push(norm(s.text));
    for (const el of s.elements) {
      if (el.testId) this.testIds.add(el.testId);
      this.roles.add(el.role);
      if (el.name) {
        this.roleNames.add(`${el.role}|${norm(el.name)}`);
        this.corpus.push(norm(el.name));
      }
      if (el.label) this.labels.add(norm(el.label));
      if (el.placeholder) this.placeholders.add(norm(el.placeholder));
      el.options?.forEach((o) => {
        this.optionValues.add(norm(o.value));
        this.optionValues.add(norm(o.label));
      });
    }
  }

  /** Returns null when grounded, otherwise a reason. */
  checkTarget(t: Target): string | null {
    if ('testId' in t) return this.testIds.has(t.testId) ? null : `testId "${t.testId}" was never observed`;
    if ('role' in t) {
      if (t.name === undefined) return this.roles.has(t.role) ? null : `no element with role "${t.role}" was observed`;
      return this.roleNames.has(`${t.role}|${norm(t.name)}`) ? null : `no ${t.role} named "${t.name}" was observed`;
    }
    if ('label' in t) return this.labels.has(norm(t.label)) ? null : `label "${t.label}" was never observed`;
    if ('placeholder' in t) return this.placeholders.has(norm(t.placeholder)) ? null : `placeholder "${t.placeholder}" was never observed`;
    if ('text' in t) return this.corpus.some((c) => c.includes(norm(t.text))) ? null : `text "${t.text}" was never observed on any page`;
    return null; // css: accepted, but discouraged by the prompt
  }

  checkStep(step: Step): string | null {
    if ('target' in step) {
      const r = this.checkTarget(step.target);
      if (r) return r;
    }
    if (step.action === 'select' && !this.optionValues.has(norm(step.value))) return `option "${step.value}" was never observed in a dropdown`;
    return null;
  }

  checkTestCase(tc: TestCase): string[] {
    const issues: string[] = [];
    tc.steps.forEach((s, i) => {
      const r = this.checkStep(s);
      if (r) issues.push(`${tc.id} step ${i + 1} (${s.action}): ${r}`);
    });
    return issues;
  }
}
