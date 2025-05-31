import chalk from 'chalk';

// Default log levels
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
  trace: 4,
};

// Default log level if config is not available
let currentLogLevel = logLevels.info;

// Function to set log level that can be called after config is loaded
export const setLogLevel = (level) => {
  currentLogLevel = logLevels[level?.toLowerCase()] ?? logLevels.info;
};

const log = (level, message, ...args) => {
  const timestamp = new Date().toISOString();
  let logMessage = `[${timestamp}] ${message}`;
  
  if (args.length > 0) {
    logMessage += ' ' + args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ');
  }

  // Skip if log level is not enabled
  if (level === 'debug' && currentLogLevel < logLevels.debug) return;
  if (level === 'trace' && currentLogLevel < logLevels.trace) return;
  
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
      console.log(chalk.gray(`[DEBUG] ${logMessage}`));
      break;
    case 'trace':
      console.log(chalk.magenta(`[TRACE] ${logMessage}`));
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
