/**
 * Production-safe logger for the renderer process.
 *
 * In development: All logs are output normally
 * In production: Only errors and warnings are shown
 *
 * Usage:
 *   import { logger } from '@/utils/logger';
 *   logger.info('Something happened');
 *   logger.warn('Warning message');
 *   logger.error('Error occurred', error);
 */

const isDevelopment = import.meta.env.DEV;

/**
 * No-op function for suppressed logs
 */
const noop = (): void => {};

/**
 * Logger interface that matches console methods
 */
interface Logger {
  log: typeof console.log;
  info: typeof console.info;
  debug: typeof console.debug;
  warn: typeof console.warn;
  error: typeof console.error;
}

/**
 * Create the logger based on environment.
 * In production, suppress log/info/debug but keep warn/error.
 */
function createLogger(): Logger {
  if (isDevelopment) {
    return {
      log: console.log.bind(console),
      info: console.info.bind(console),
      debug: console.debug.bind(console),
      warn: console.warn.bind(console),
      error: console.error.bind(console)
    };
  }

  // Production: only show warnings and errors
  return {
    log: noop,
    info: noop,
    debug: noop,
    warn: console.warn.bind(console),
    error: console.error.bind(console)
  };
}

export const logger = createLogger();

// Also export individual methods for convenience
export const { log, info, debug, warn, error } = logger;
