/**
 * Lightweight tagged logger for the updater module.
 * Uses console.debug/info/warn/error with a structured prefix.
 * No external dependencies.
 */

interface TaggedLogger {
  debug: (msg: string, ...args: unknown[]) => void;
  info: (msg: string, ...args: unknown[]) => void;
  warn: (msg: string, ...args: unknown[]) => void;
  error: (msg: string, ...args: unknown[]) => void;
}

function createLogger(module: string): TaggedLogger {
  const prefix = `[Updater:${module}]`;
  return {
    debug: (msg: string, ...args: unknown[]) =>
      console.debug(`${prefix} ${msg}`, ...args),
    info: (msg: string, ...args: unknown[]) =>
      console.info(`${prefix} ${msg}`, ...args),
    warn: (msg: string, ...args: unknown[]) =>
      console.warn(`${prefix} ${msg}`, ...args),
    error: (msg: string, ...args: unknown[]) =>
      console.error(`${prefix} ${msg}`, ...args),
  };
}

export const log = createLogger("Store");
