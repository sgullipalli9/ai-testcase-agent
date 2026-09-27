import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { SiteConfig } from '../config.js';
import type { TestSuite } from '../model/testCase.js';
import { generateCsv, generateMarkdown } from './docs.js';
import { generateSpec } from './playwright.js';

export function moduleDir(outRoot: string, site: string, module: string): string {
  return join(outRoot, site, module);
}

export async function writeSuite(outRoot: string, site: SiteConfig, suite: TestSuite): Promise<string> {
  const mod = site.modules.find((m) => m.name === suite.module);
  if (!mod) throw new Error(`Module ${suite.module} not found on ${site.name}`);
  const dir = moduleDir(outRoot, site.name, suite.module);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, 'test-cases.json'), JSON.stringify(suite, null, 2) + '\n');
  await writeFile(join(dir, 'test-cases.md'), generateMarkdown(site, suite));
  await writeFile(join(dir, 'test-cases.csv'), generateCsv(suite));
  await writeFile(join(dir, `${suite.module}.spec.ts`), generateSpec(site, suite, mod.requiresAuth));
  await writeSiteIndex(outRoot, site);
  return dir;
}

export async function readSuite(outRoot: string, site: string, module: string): Promise<TestSuite> {
  return JSON.parse(await readFile(join(moduleDir(outRoot, site, module), 'test-cases.json'), 'utf8')) as TestSuite;
}

/** generated/<site>/README.md — one table summarising every module that has output. */
export async function writeSiteIndex(outRoot: string, site: SiteConfig): Promise<void> {
  const rows: string[] = [];
  let total = 0;
  const entries = await readdir(join(outRoot, site.name), { withFileTypes: true });
  for (const m of site.modules) {
    if (!entries.some((e) => e.isDirectory() && e.name === m.name)) continue;
    const suite = await readSuite(outRoot, site.name, m.name).catch(() => undefined);
    if (!suite) continue;
    total += suite.testCases.length;
    const by = (p: string) => suite.testCases.filter((t) => t.priority === p).length;
    const status = (s: string) => suite.testCases.filter((t) => t.validation.status === s).length;
    rows.push(
      `| [${m.name}](./${m.name}/test-cases.md) | ${suite.testCases.length} | ${by('P0')}/${by('P1')}/${by('P2')}/${by('P3')} | ${status('validated') + status('healed')} | ${status('suspected-defect')} | [spec](./${m.name}/${m.name}.spec.ts) · [csv](./${m.name}/test-cases.csv) |`,
    );
  }
  const md = [
    `# ${site.name} — generated test suite`,
    '',
    site.description,
    '',
    `Base URL: ${site.baseUrl} · ${total} test cases`,
    '',
    '| Module | Cases | P0/P1/P2/P3 | Passing in browser | Suspected defects | Files |',
    '|---|---|---|---|---|---|',
    ...rows,
    '',
  ].join('\n');
  await writeFile(join(outRoot, site.name, 'README.md'), md);
}
