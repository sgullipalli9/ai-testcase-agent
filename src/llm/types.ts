/** Minimal provider-neutral types, shaped after the Anthropic Messages API. */
import type { JsonSchema } from '../model/schema.js';

export type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
  | { type: 'tool_result'; tool_use_id: string; content: string; is_error?: boolean };

export interface Message {
  role: 'user' | 'assistant';
  content: string | ContentBlock[];
}

export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: JsonSchema;
}

export interface CompletionRequest {
  system: string;
  messages: Message[];
  tools: ToolDefinition[];
  maxTokens?: number;
  /** 'auto' lets the model answer in text; 'any' forces a tool call. */
  toolChoice?: 'auto' | 'any';
}

export interface Usage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
}

export interface CompletionResponse {
  content: ContentBlock[];
  stopReason: 'end_turn' | 'tool_use' | 'max_tokens' | 'stop_sequence' | string;
  usage: Usage;
}

export interface LLMProvider {
  readonly name: string;
  readonly model: string;
  complete(req: CompletionRequest): Promise<CompletionResponse>;
}
