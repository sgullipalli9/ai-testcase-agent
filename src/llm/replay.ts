/**
 * Record / replay of LLM turns ("VCR" pattern).
 *  - RecordingProvider wraps a live provider and saves every response to a JSON cassette.
 *  - ReplayProvider plays a cassette back in order, so the full agent pipeline (browser,
 *    grounding, validation, healing, codegen) runs deterministically with no API key — used by
 *    `npm run demo` and by CI.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { CompletionRequest, CompletionResponse, LLMProvider } from './types.js';

export interface Cassette {
  model: string;
  recordedAt: string;
  responses: CompletionResponse[];
}

export class ReplayProvider implements LLMProvider {
  readonly name = 'replay';
  private cursor = 0;

  private constructor(
    private readonly cassette: Cassette,
    private readonly file: string,
  ) {}

  get model(): string {
    return `${this.cassette.model} (replayed)`;
  }

  static async load(file: string): Promise<ReplayProvider> {
    const cassette = JSON.parse(await readFile(file, 'utf8')) as Cassette;
    return new ReplayProvider(cassette, file);
  }

  async complete(_req: CompletionRequest): Promise<CompletionResponse> {
    const next = this.cassette.responses[this.cursor++];
    if (!next) throw new Error(`Cassette ${this.file} exhausted after ${this.cursor - 1} responses — re-record it with --record.`);
    return structuredClone(next);
  }
}

export class RecordingProvider implements LLMProvider {
  readonly name: string;
  private readonly responses: CompletionResponse[] = [];

  constructor(
    private readonly inner: LLMProvider,
    private readonly file: string,
  ) {
    this.name = `${inner.name}+record`;
  }

  get model(): string {
    return this.inner.model;
  }

  async complete(req: CompletionRequest): Promise<CompletionResponse> {
    const res = await this.inner.complete(req);
    this.responses.push(structuredClone(res));
    return res;
  }

  async save(): Promise<void> {
    const cassette: Cassette = { model: this.inner.model, recordedAt: new Date().toISOString(), responses: this.responses };
    await mkdir(dirname(this.file), { recursive: true });
    await writeFile(this.file, JSON.stringify(cassette, null, 2) + '\n');
  }
}
