/**
 * JSON Schema for the test-case model. It is used twice:
 *  1. as the `input_schema` of the Claude tools, so the model is constrained at generation time;
 *  2. by our own validator (./validate.ts), so nothing unvalidated reaches the browser or codegen.
 */
import { PRIORITIES, TEST_TYPES } from './testCase.js';

export type JsonSchema = {
  type?: 'object' | 'array' | 'string' | 'number' | 'integer' | 'boolean';
  description?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  additionalProperties?: boolean;
  items?: JsonSchema;
  minItems?: number;
  maxItems?: number;
  minLength?: number;
  minimum?: number;
  pattern?: string;
  enum?: readonly (string | number)[];
  const?: string | number | boolean;
  anyOf?: JsonSchema[];
};

const nth: JsonSchema = { type: 'integer', minimum: 0, description: 'Zero-based index when the locator matches several elements.' };
const str = (description?: string): JsonSchema => ({ type: 'string', minLength: 1, ...(description ? { description } : {}) });

export const targetSchema: JsonSchema = {
  description:
    'Element locator. Prefer testId, then role+name, then label/placeholder, then text. css is a last resort. Only use locators you observed in a snapshot.',
  anyOf: [
    { type: 'object', properties: { testId: str(), nth }, required: ['testId'], additionalProperties: false },
    {
      type: 'object',
      properties: { role: str('ARIA role, e.g. button, link, textbox, heading, combobox'), name: { type: 'string' }, exact: { type: 'boolean' }, nth },
      required: ['role'],
      additionalProperties: false,
    },
    { type: 'object', properties: { label: str(), exact: { type: 'boolean' }, nth }, required: ['label'], additionalProperties: false },
    { type: 'object', properties: { placeholder: str(), nth }, required: ['placeholder'], additionalProperties: false },
    { type: 'object', properties: { text: str(), exact: { type: 'boolean' }, nth }, required: ['text'], additionalProperties: false },
    { type: 'object', properties: { css: str(), nth }, required: ['css'], additionalProperties: false },
  ],
};

const note: JsonSchema = { type: 'string', description: 'Optional human-readable wording for the manual test step.' };

function step(action: string, props: Record<string, JsonSchema>, description: string): JsonSchema {
  return {
    type: 'object',
    description,
    properties: { action: { const: action }, note, ...props },
    required: ['action', ...Object.keys(props).filter((k) => k !== 'exact')],
    additionalProperties: false,
  };
}

export const stepSchema: JsonSchema = {
  anyOf: [
    step('goto', { path: str('Path relative to the site base URL, e.g. "/" or "/cart.html"') }, 'Navigate to a page.'),
    step('click', { target: targetSchema }, 'Click an element.'),
    step('fill', { target: targetSchema, value: { type: 'string' } }, 'Type into an input (may be empty string).'),
    step('select', { target: targetSchema, value: str() }, 'Choose an <option> by value or label.'),
    step('press', { target: targetSchema, key: str('e.g. Enter, Tab') }, 'Press a keyboard key on an element.'),
    step('check', { target: targetSchema }, 'Check a checkbox or radio.'),
    step('expectVisible', { target: targetSchema }, 'Assert element is visible.'),
    step('expectHidden', { target: targetSchema }, 'Assert element is hidden or absent.'),
    step('expectText', { target: targetSchema, text: { type: 'string' }, exact: { type: 'boolean' } }, 'Assert element text (substring unless exact=true).'),
    step('expectValue', { target: targetSchema, value: { type: 'string' } }, 'Assert an input value.'),
    step('expectCount', { target: targetSchema, count: { type: 'integer', minimum: 0 } }, 'Assert how many elements match.'),
    step('expectUrl', { contains: str() }, 'Assert the current URL contains a string.'),
    step(
      'expectSorted',
      {
        target: targetSchema,
        order: { type: 'string', enum: ['asc', 'desc'] },
        by: { type: 'string', enum: ['text', 'number'] },
      },
      'Assert the texts of all matched elements are sorted.',
    ),
  ],
};

export const testCaseSchema: JsonSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', pattern: '^TC-[A-Z0-9]+-\\d{3}$', description: 'e.g. TC-LOGIN-001' },
    title: str('Short, specific, starts with a verb.'),
    objective: str('The risk or requirement this case covers.'),
    type: { type: 'string', enum: TEST_TYPES },
    priority: { type: 'string', enum: PRIORITIES, description: 'P0 = release blocker ... P3 = cosmetic' },
    technique: { type: 'string', description: 'Test design technique, e.g. equivalence partitioning, boundary value analysis.' },
    tags: { type: 'array', items: str() },
    preconditions: { type: 'array', items: str() },
    steps: { type: 'array', items: stepSchema, minItems: 2 },
    expectedResult: str(),
  },
  required: ['id', 'title', 'objective', 'type', 'priority', 'tags', 'preconditions', 'steps', 'expectedResult'],
  additionalProperties: false,
};
