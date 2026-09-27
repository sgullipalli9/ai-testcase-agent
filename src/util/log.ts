const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 } as const;
type Level = keyof typeof LEVELS;

const color = (code: number, s: string) => (process.stdout.isTTY ? `\x1b[${code}m${s}\x1b[0m` : s);
const threshold = () => LEVELS[(process.env.LOG_LEVEL as Level) ?? 'info'] ?? LEVELS.info;

function emit(level: Level, tag: string, msg: string) {
  if (LEVELS[level] < threshold()) return;
  const line = `${color(90, new Date().toISOString().slice(11, 19))} ${tag} ${msg}`;
  (level === 'error' ? console.error : console.log)(line);
}

export const log = {
  debug: (m: string) => emit('debug', color(90, 'DBG'), m),
  info: (m: string) => emit('info', color(36, 'INF'), m),
  step: (m: string) => emit('info', color(35, '>>>'), m),
  ok: (m: string) => emit('info', color(32, ' OK'), m),
  warn: (m: string) => emit('warn', color(33, 'WRN'), m),
  error: (m: string) => emit('error', color(31, 'ERR'), m),
};
