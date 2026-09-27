#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { getSite, sites } from '../sites/index.js';
import { generateForModule } from './pipeline.js';
import { AnthropicProvider } from './llm/anthropic.js';
import { RecordingProvider, ReplayProvider } from './llm/replay.js';
import type { LLMProvider } from './llm/types.js';
import { readSuite, writeSuite } from './generators/writeOutputs.js';
import { testCaseSchema } from './model/schema.js';
import { validate } from './model/validate.js';
import { ensureLocalServer } from './util/localServer.js';
import { log } from './util/log.js';

const HELP = `ai-testcase-agent — explore a web module with Claude + Playwright and generate validated test cases

Usage:
  node dist/src/cli.js generate --site <site> --module <module|all> [options]
  node dist/src/cli.js render   --site <site> [--module <module|all>]   Re-render md/csv/spec from test-cases.json
  node dist/src/cli.js list                                             List sites and modules

Options:
  --llm <anthropic|replay>  LLM backend (default: anthropic; replay uses fixtures/replay/<site>/<module>.json)
  --record                  Save the live LLM responses as a replay cassette
  --no-validate             Skip browser validation & healing
  --heal <n>                Max heal attempts per failing test (default 2)
  --max-turns <n>           Agent turn budget (default 40)
  --out <dir>               Output root (default: generated)
  --headed                  Show the browser
`;

function loadEnv() {
  try {
    if (existsSync('.env')) process.loadEnvFile('.env');
  } catch {
    /* optional */
  }
}

async function main() {
  loadEnv();
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: {
      site: { type: 'string' },
      module: { type: 'string', default: 'all' },
      llm: { type: 'string', default: 'anthropic' },
      record: { type: 'boolean', default: false },
      'no-validate': { type: 'boolean', default: false },
      heal: { type: 'string', default: '2' },
      'max-turns': { type: 'string', default: '40' },
      out: { type: 'string', default: 'generated' },
      headed: { type: 'boolean', default: false },
      help: { type: 'boolean', default: false },
    },
  });
  const command = positionals[0];

  if (!command || values.help) return void console.log(HELP);

  if (command === 'list') {
    for (const s of Object.values(sites)) console.log(`${s.name.padEnd(12)} ${s.baseUrl}\n  modules: ${s.modules.map((m) => m.name).join(', ')}`);
    return;
  }

  if (!values.site) throw new Error('--site is required');
  const site = getSite(values.site);
  const modules = values.module === 'all' ? site.modules : site.modules.filter((m) => m.name === values.module);
  if (!modules.length) throw new Error(`Unknown module "${values.module}" for ${site.name}. Available: ${site.modules.map((m) => m.name).join(', ')}`);

  if (command === 'render') {
    for (const m of modules) {
      const suite = await readSuite(values.out!, site.name, m.name).catch(() => undefined);
      if (!suite) {
        log.warn(`no test-cases.json for ${site.name}/${m.name}, skipping`);
        continue;
      }
      const errors = suite.testCases.flatMap(({ validation: _v, ...tc }) =>
        validate(testCaseSchema, tc, tc.id ?? '?').map((e) => `${e.path} ${e.message}`),
      );
      if (errors.length) throw new Error(`Invalid test-cases.json for ${site.name}/${m.name}:\n${errors.join('\n')}`);
      log.ok(`rendered ${await writeSuite(values.out!, site, suite)}`);
    }
    return;
  }

  if (command !== 'generate') throw new Error(`Unknown command "${command}"\n\n${HELP}`);

  const server = await ensureLocalServer(site);
  try {
    for (const m of modules) {
      const cassette = join('fixtures', 'replay', site.name, `${m.name}.json`);
      let llm: LLMProvider;
      if (values.llm === 'replay') llm = await ReplayProvider.load(cassette);
      else if (values.llm === 'anthropic') llm = new AnthropicProvider();
      else throw new Error(`Unknown --llm ${values.llm}`);
      if (values.record) llm = new RecordingProvider(llm, cassette);

      const suite = await generateForModule(llm, site, m, {
        outDir: values.out!,
        validate: !values['no-validate'],
        maxHealAttempts: Number(values.heal),
        maxTurns: Number(values['max-turns']),
        headed: values.headed!,
      });
      if (llm instanceof RecordingProvider) {
        await llm.save();
        log.ok(`recorded cassette ${cassette}`);
      }
      const c = suite.metrics!.statusCounts;
      log.ok(
        `${site.name}/${m.name}: ${suite.testCases.length} cases — validated ${c.validated}, healed ${c.healed}, suspected defects ${c['suspected-defect']}, quarantined ${c.quarantined}`,
      );
    }
  } finally {
    server?.kill();
  }
}

main().catch((err) => {
  log.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
