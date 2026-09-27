/**
 * A small, dependency-free JSON Schema validator covering the subset used in ./schema.ts.
 * It produces LLM-friendly error messages (path + reason) that are fed back to the model
 * so it can self-correct its tool call.
 */
import type { JsonSchema } from './schema.js';

export interface SchemaError {
  path: string;
  message: string;
}

function typeOf(v: unknown): string {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  if (typeof v === 'number' && Number.isInteger(v)) return 'integer';
  return typeof v;
}

function typeMatches(expected: JsonSchema['type'], v: unknown): boolean {
  const actual = typeOf(v);
  if (expected === 'number') return actual === 'number' || actual === 'integer';
  return actual === expected;
}

export function validate(schema: JsonSchema, value: unknown, path = '$'): SchemaError[] {
  const errors: SchemaError[] = [];

  if (schema.anyOf) {
    const branchErrors = schema.anyOf.map((s) => validate(s, value, path));
    if (branchErrors.some((e) => e.length === 0)) return errors;
    // Discriminator-aware reporting: if a branch's `const` matches (e.g. action: "click"),
    // report that branch's errors instead of a vague "matches none of anyOf".
    const obj = value as Record<string, unknown> | null;
    const idx = schema.anyOf.findIndex((s) =>
      Object.entries(s.properties ?? {}).some(([k, p]) => p.const !== undefined && obj?.[k] === p.const),
    );
    if (idx >= 0) return branchErrors[idx]!;
    const discriminator = Object.entries(schema.anyOf[0]?.properties ?? {}).find(([, p]) => p.const !== undefined)?.[0];
    if (discriminator && obj && typeof obj === 'object') {
      const allowed = schema.anyOf.map((s) => s.properties?.[discriminator]?.const).join(', ');
      errors.push({ path: `${path}.${discriminator}`, message: `must be one of ${allowed}` });
      return errors;
    }
    const keysIdx = schema.anyOf.findIndex((s) => s.required?.every((k) => obj && typeof obj === 'object' && k in obj));
    if (keysIdx >= 0) return branchErrors[keysIdx]!;
    const hint = schema.anyOf
      .map((s) => s.required?.join('+') ?? (s.properties?.action?.const as string | undefined))
      .filter(Boolean)
      .join(' | ');
    errors.push({ path, message: `does not match any allowed shape (${hint})` });
    return errors;
  }

  if (schema.const !== undefined && value !== schema.const) {
    errors.push({ path, message: `must equal ${JSON.stringify(schema.const)}` });
    return errors;
  }
  if (schema.type && !typeMatches(schema.type, value)) {
    errors.push({ path, message: `must be ${schema.type}, got ${typeOf(value)}` });
    return errors;
  }
  if (schema.enum && !schema.enum.includes(value as string | number)) {
    errors.push({ path, message: `must be one of ${schema.enum.join(', ')}` });
  }
  if (typeof value === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength) errors.push({ path, message: 'must not be empty' });
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) errors.push({ path, message: `must match /${schema.pattern}/` });
  }
  if (typeof value === 'number' && schema.minimum !== undefined && value < schema.minimum) {
    errors.push({ path, message: `must be >= ${schema.minimum}` });
  }
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) errors.push({ path, message: `needs at least ${schema.minItems} items` });
    if (schema.maxItems !== undefined && value.length > schema.maxItems) errors.push({ path, message: `allows at most ${schema.maxItems} items` });
    if (schema.items) value.forEach((item, i) => errors.push(...validate(schema.items!, item, `${path}[${i}]`)));
  }
  if (schema.type === 'object' && value && typeof value === 'object' && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    for (const key of schema.required ?? []) {
      if (!(key in obj)) errors.push({ path: `${path}.${key}`, message: 'is required' });
    }
    for (const [key, v] of Object.entries(obj)) {
      const prop = schema.properties?.[key];
      if (prop) errors.push(...validate(prop, v, `${path}.${key}`));
      else if (schema.additionalProperties === false) errors.push({ path: `${path}.${key}`, message: 'is not an allowed property' });
    }
  }
  return errors;
}

export function formatErrors(errors: SchemaError[], max = 15): string {
  const lines = errors.slice(0, max).map((e) => `- ${e.path} ${e.message}`);
  if (errors.length > max) lines.push(`- ...and ${errors.length - max} more`);
  return lines.join('\n');
}
