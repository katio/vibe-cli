import chalk from 'chalk';
import { config } from '../config/config.js';

const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
  trace: 4,
};

const logLevel = logLevels[config.logLevel.toLowerCase()] || logLevels.info;

const log = (level, message, ...args) => {
  const timestamp = new Date().toISOString();
  let logMessage = `[${timestamp}] ${message}`;
  
  if (args.length > 0) {
    logMessage += ' ' + args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ');
  }

  switch (level) {
    case 'error':
      console.error(chalk.red(`[ERROR] ${logMessage}`));
      break;
    case 'warn':
      console.warn(chalk.yellow(`[WARN] ${logMessage}`));
      break;
    case 'info':
      console.log(chalk.blue(`[INFO] ${logMessage}`));
      break;
    case 'debug':
      if (logLevel >= logLevels.debug) {
        console.log(chalk.gray(`[DEBUG] ${logMessage}`));
      }
      break;
    case 'trace':
      if (logLevel >= logLevels.trace) {
        console.log(chalk.gray(`[TRACE] ${logMessage}`));
      }
      break;
    default:
      console.log(logMessage);
  }
};

export const logger = {
  error: (message, ...args) => log('error', message, ...args),
  warn: (message, ...args) => log('warn', message, ...args),
  info: (message, ...args) => log('info', message, ...args),
  debug: (message, ...args) => log('debug', message, ...args),
  trace: (message, ...args) => log('trace', message, ...args),
  success: (message, ...args) => {
    const timestamp = new Date().toISOString();
    console.log(chalk.green(`[${timestamp}] [SUCCESS] ${message}`), ...args);
  },
};
