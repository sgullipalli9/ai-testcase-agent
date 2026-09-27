import type { Step } from './model/testCase.js';

/**
 * A "site" ties the agent to a web application. Each site exposes one or more modules
 * (login, cart, checkout, ...). The agent works on one module at a time.
 */
export interface SiteConfig {
  /** Slug used on the CLI and as output folder name. */
  name: string;
  baseUrl: string;
  description: string;
  /** Attribute used by getByTestId(). SauceDemo uses data-test. */
  testIdAttribute?: string;
  /** Test data the agent may use (credentials, customer details, ...). Shown verbatim to the model. */
  testData: Record<string, unknown>;
  /** How to get an authenticated session. Executed before exploring/validating modules with requiresAuth. */
  auth?: {
    description: string;
    steps: Step[];
  };
  /** Optional local server the CLI should start (used by the offline demo site). */
  localServer?: { command: string; args: string[]; readyUrl: string };
  modules: ModuleConfig[];
}

export interface ModuleConfig {
  name: string;
  /** Plain-language description of the feature under test, like a user story. */
  description: string;
  /** Where exploration starts (after auth, if required). */
  entryPath: string;
  requiresAuth: boolean;
  /** Risks / behaviours the test design must cover. Acts as lightweight acceptance criteria. */
  focus: string[];
  /** Soft bounds on how many test cases to produce. */
  minCases?: number;
  maxCases?: number;
}

export function defineSite(config: SiteConfig): SiteConfig {
  return config;
}
