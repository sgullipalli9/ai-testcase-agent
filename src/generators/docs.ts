/** Human-facing outputs: Markdown test-case document and a CSV for test-management import. */
import type { SiteConfig } from '../config.js';
import type { TestSuite, ValidatedTestCase, ValidationStatus } from '../model/testCase.js';
import { isAssertion, narrateStep } from '../steps/actions.js';

const STATUS_LABEL: Record<ValidationStatus, string> = {
  validated: 'Validated',
  healed: 'Healed',
  'suspected-defect': 'Suspected defect',
  quarantined: 'Quarantined',
  'not-validated': 'Not validated',
};

/** Groups DSL steps into manual "action -> expected" rows. */
export function manualSteps(tc: ValidatedTestCase): { action: string; expected: string }[] {
  const rows: { action: string; expected: string[] }[] = [];
  for (const s of tc.steps) {
    if (isAssertion(s) && rows.length) rows.at(-1)!.expected.push(narrateStep(s));
    else if (isAssertion(s)) rows.push({ action: '—', expected: [narrateStep(s)] });
    else rows.push({ action: narrateStep(s), expected: [] });
  }
  return rows.map((r) => ({ action: r.action, expected: r.expected.join('; ') }));
}

const cell = (s: string) => s.replace(/\|/g, '\\|').replace(/\n/g, ' ');

export function generateMarkdown(site: SiteConfig, suite: TestSuite): string {
  const out: string[] = [];
  const mod = site.modules.find((m) => m.name === suite.module);
  out.push(`# ${site.name} › ${suite.module} — Test Cases`, '');
  if (mod) out.push(`> ${mod.description}`, '');
  out.push(`Generated ${suite.generatedAt.slice(0, 10)} by \`${suite.generator.model}\` (${suite.generator.provider}).`, '');
  out.push('## Coverage summary', '', suite.coverageSummary, '');

  if (suite.metrics) {
    const m = suite.metrics;
    const counts = Object.entries(m.statusCounts)
      .filter(([, n]) => n > 0)
      .map(([k, n]) => `${STATUS_LABEL[k as ValidationStatus]}: ${n}`)
      .join(' · ');
    out.push('## Run metrics', '', `| Agent turns | Tool calls | Grounding rejections | Input tokens | Output tokens | Duration |`, `|---|---|---|---|---|---|`);
    const tokens = (n: number) => (suite.generator.provider === 'replay' ? 'n/a (replay)' : n.toLocaleString('en-US'));
    out.push(`| ${m.agentTurns} | ${m.toolCalls} | ${m.groundingRejections} | ${tokens(m.inputTokens)} | ${tokens(m.outputTokens)} | ${(m.durationMs / 1000).toFixed(1)}s |`, '', counts, '');
  }

  out.push('## Index', '', '| ID | Title | Type | Priority | Status |', '|---|---|---|---|---|');
  for (const tc of suite.testCases) out.push(`| [${tc.id}](#${tc.id.toLowerCase()}) | ${cell(tc.title)} | ${tc.type} | ${tc.priority} | ${STATUS_LABEL[tc.validation.status]} |`);
  out.push('');

  for (const tc of suite.testCases) {
    out.push(`### ${tc.id}`, '', `**${tc.title}**`, '');
    out.push(`- **Objective:** ${tc.objective}`);
    out.push(`- **Type / priority:** ${tc.type} · ${tc.priority}${tc.technique ? ` · _${tc.technique}_` : ''}`);
    if (tc.tags.length) out.push(`- **Tags:** ${tc.tags.map((t) => `\`${t}\``).join(' ')}`);
    out.push(`- **Preconditions:** ${tc.preconditions.length ? tc.preconditions.join('; ') : 'None'}`);
    out.push(`- **Automation status:** ${STATUS_LABEL[tc.validation.status]}${tc.validation.rationale ? ` — ${tc.validation.rationale}` : ''}`, '');
    out.push('| # | Action | Expected result |', '|---|---|---|');
    manualSteps(tc).forEach((r, i) => out.push(`| ${i + 1} | ${cell(r.action)} | ${cell(r.expected)} |`));
    out.push('', `**Expected result:** ${tc.expectedResult}`, '');
  }
  return out.join('\n');
}

const csvField = (s: string) => `"${s.replace(/"/g, '""')}"`;

/** Columns chosen to map cleanly onto TestRail / Xray / Zephyr CSV importers. */
export function generateCsv(suite: TestSuite): string {
  const header = ['ID', 'Title', 'Module', 'Type', 'Priority', 'Technique', 'Preconditions', 'Steps', 'Expected Result', 'Tags', 'Automation Status'];
  const rows = suite.testCases.map((tc) => {
    const steps = manualSteps(tc)
      .map((r, i) => `${i + 1}. ${r.action}${r.expected ? ` => ${r.expected}` : ''}`)
      .join('\n');
    return [tc.id, tc.title, suite.module, tc.type, tc.priority, tc.technique ?? '', tc.preconditions.join('\n'), steps, tc.expectedResult, tc.tags.join(', '), tc.validation.status];
  });
  return [header, ...rows].map((r) => r.map(csvField).join(',')).join('\n') + '\n';
}
