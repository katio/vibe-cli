#!/usr/bin/env node

import chalk from 'chalk';
import { handleUncaughtExceptions, handleUnhandledRejections, handleSigterm } from './utils/errorHandler.js';
import cli from './cli/index.js';

// Set up global error handlers
handleUncaughtExceptions();
handleUnhandledRejections();
handleSigterm();

// Display Node.js version requirement
const requiredVersion = '18.0.0';
const currentVersion = process.versions.node;

if (currentVersion < requiredVersion) {
  console.error(
    chalk.red(`
    Vibe CLI requires Node.js ${requiredVersion} or higher.
    You are currently using Node.js ${currentVersion}.
    Please update your Node.js version to continue.
    `)
  );
  process.exit(1);
}

/**
 * Main application entry point
 */
async function main() {
  try {
    console.log(chalk.blue('🚀 Starting Vibe CLI...'));
    
    // Initialize the CLI
    await cli.initialize();
    
    // Start the interactive CLI
    await cli.start();
    
  } catch (error) {
    console.error(chalk.red('\n❌ Fatal error:'), error.message);
    if (process.env.NODE_ENV === 'development') {
      console.error(chalk.gray('\nStack trace:'));
      console.error(chalk.gray(error.stack));
    }
    process.exit(1);
  }
}

// Only run if this is the main module (not required/imported)
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main };
