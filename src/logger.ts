import { includes } from 'lodash';
import { getLogger as createLogger, Logger } from 'log4js';

import { validateStringOption } from './utils';

const LOG_LEVELS = [ 'trace', 'debug', 'info', 'warn', 'error', 'fatal' ];

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LoggerOptions {
  logLevel?: LogLevel;
}

export function getLogger(name: string, options: LoggerOptions = {}): Logger {
  const logger = createLogger(name);
  logger.level = options.logLevel ?? 'info';
  return logger;
}

export function validateLogLevelOption(options: LoggerOptions): LogLevel {
  validateStringOption(options, 'logLevel');

  const logLevel = options.logLevel;
  if (logLevel !== undefined && !includes(LOG_LEVELS, logLevel.toLowerCase())) {
    throw new Error(`"logLevel" option must be one of the following values: ${LOG_LEVELS.map(level => `"${level}"`).join(', ')}; got ${logLevel}`);
  }

  return logLevel as LogLevel;
}
