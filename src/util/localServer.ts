import { spawn, type ChildProcess } from 'node:child_process';
import type { SiteConfig } from '../config.js';
import { log } from './log.js';

async function isUp(url: string): Promise<boolean> {
  try {
    return (await fetch(url)).ok;
  } catch {
    return false;
  }
}

/** Starts the site's local server if it has one and it is not already running. */
export async function ensureLocalServer(site: SiteConfig): Promise<ChildProcess | undefined> {
  const cfg = site.localServer;
  if (!cfg || (await isUp(cfg.readyUrl))) return undefined;
  log.info(`starting local server for ${site.name}: ${cfg.command} ${cfg.args.join(' ')}`);
  const child = spawn(cfg.command, cfg.args, { stdio: 'ignore' });
  for (let i = 0; i < 50; i++) {
    if (await isUp(cfg.readyUrl)) return child;
    await new Promise((r) => setTimeout(r, 100));
  }
  child.kill();
  throw new Error(`Local server for ${site.name} did not come up at ${cfg.readyUrl}`);
}
