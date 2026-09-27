/**
 * Claude provider over the Messages REST API (no SDK dependency).
 * - Prompt caching on the system prompt + tool definitions (they are identical every turn).
 * - Retries with exponential backoff + jitter on 429 / 5xx / 529 (overloaded), honouring retry-after.
 */
import { log } from '../util/log.js';
import type { CompletionRequest, CompletionResponse, ContentBlock, LLMProvider } from './types.js';

const API_URL = 'https://api.anthropic.com/v1/messages';
const API_VERSION = '2023-06-01';
export const DEFAULT_MODEL = 'claude-sonnet-5';

interface ApiResponse {
  content: ContentBlock[];
  stop_reason: string;
  usage: { input_tokens: number; output_tokens: number; cache_read_input_tokens?: number };
}

export class AnthropicProvider implements LLMProvider {
  readonly name = 'anthropic';

  constructor(
    private readonly apiKey = process.env.ANTHROPIC_API_KEY ?? '',
    readonly model = process.env.ANTHROPIC_MODEL ?? DEFAULT_MODEL,
    private readonly maxRetries = 5,
  ) {
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set. Copy .env.example to .env, or run `npm run demo` for the offline replay.');
  }

  async complete(req: CompletionRequest): Promise<CompletionResponse> {
    const tools = req.tools.map((t, i) => (i === req.tools.length - 1 ? { ...t, cache_control: { type: 'ephemeral' } } : t));
    const body = {
      model: this.model,
      max_tokens: req.maxTokens ?? 16_000,
      system: [{ type: 'text', text: req.system, cache_control: { type: 'ephemeral' } }],
      messages: req.messages,
      tools,
      tool_choice: { type: req.toolChoice ?? 'auto' },
    };

    for (let attempt = 0; ; attempt++) {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': this.apiKey, 'anthropic-version': API_VERSION },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const data = (await res.json()) as ApiResponse;
        return {
          content: data.content,
          stopReason: data.stop_reason,
          usage: {
            inputTokens: data.usage.input_tokens,
            outputTokens: data.usage.output_tokens,
            cacheReadTokens: data.usage.cache_read_input_tokens ?? 0,
          },
        };
      }
      const retryable = res.status === 429 || res.status === 529 || res.status >= 500;
      const text = await res.text();
      if (!retryable || attempt >= this.maxRetries) throw new Error(`Anthropic API ${res.status}: ${text.slice(0, 500)}`);
      const retryAfter = Number(res.headers.get('retry-after'));
      const delay = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : Math.min(30_000, 1000 * 2 ** attempt) + Math.random() * 500;
      log.warn(`Anthropic API ${res.status}, retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${this.maxRetries})`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}
