/**
 * Logger utility that only logs in development mode.
 * In production, all logs are silenced for better performance.
 */
export const logger = {
  log: (...args: any[]) => {
    if (__DEV__) console.log(...args);
  },
  error: (...args: any[]) => {
    // Always log errors, even in production
    console.error(...args);
  },
  warn: (...args: any[]) => {
    if (__DEV__) console.warn(...args);
  },
};
