import type { SiteConfig } from '../src/config.js';
import demoShop from './demo-shop.site.js';
import saucedemo from './saucedemo.site.js';

/** Register new sites here. Adding a site = one config file, no code changes. */
export const sites: Record<string, SiteConfig> = {
  [saucedemo.name]: saucedemo,
  [demoShop.name]: demoShop,
};

export function getSite(name: string): SiteConfig {
  const site = sites[name];
  if (!site) throw new Error(`Unknown site "${name}". Available: ${Object.keys(sites).join(', ')}`);
  return site;
}
