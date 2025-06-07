#!/usr/bin/env node

// Load environment variables first
import 'dotenv/config';

// Set up global error handlers before anything else
import { handleUncaughtExceptions, handleUnhandledRejections, handleSigterm } from './utils/errorHandler.js';
handleUncaughtExceptions();
handleUnhandledRejections();
handleSigterm();

// Now import other dependencies
import chalk from 'chalk';
import cli, { appState } from './cli/index.js';
import { askCommand } from './commands/ask.js';
import { loadCommand } from './commands/load.js';

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
 * Handle direct command execution
 * @param {string[]} args - Command line arguments
 */
async function handleDirectCommand(args) {
  const command = args[0]?.toLowerCase();
  
  if (!command) {
    console.log(chalk.yellow('No command provided. Starting interactive mode...\n'));
    return false; // Fall back to interactive mode
  }
  
  try {
    // Handle help command
    if (['help', 'h', '--help', '-h'].includes(command)) {
      console.log(chalk.cyan('\nVibe CLI - Available commands:'));
      console.log(chalk.cyan('----------------------------'));
      console.log(chalk.yellow('  /load <path>') + '    - Load a directory into the knowledge base');
      console.log(chalk.yellow('  /ask <question>') + ' - Ask a question about your codebase');
      console.log(chalk.yellow('  /folders') + '        - List all loaded folders');
      console.log(chalk.yellow('  /use <id|path>') + '   - Switch to a specific folder');
      console.log(chalk.yellow('  /reset') + '          - Reset the database');
      console.log(chalk.yellow('  /help') + '           - Show this help');
      console.log(chalk.yellow('  /exit, /quit, /q') + ' - Exit the application\n');
      return true;
    }
    
    // Handle load command
    if (['load', 'l'].includes(command)) {
      const path = args.slice(1).join(' ');
      if (!path) {
        console.log(chalk.yellow('\nPlease specify a directory path to load\n'));
        return true;
      }
      await loadCommand(path);
      return true;
    }
    
    // Handle ask command (or any other input as a question)
    if (['ask', 'a'].includes(command)) {
      const question = args.slice(1).join(' ');
      if (!question) {
        console.log(chalk.yellow('\nPlease provide a question\n'));
        return true;
      }
      await askCommand(question);
      return true;
    }
    
    // Handle other commands that might be implemented
    console.log(chalk.yellow(`\nUnknown command: ${command}`));
    console.log(chalk.gray('Type /help to see available commands\n'));
    return true;
    
  } catch (error) {
    console.error(chalk.red('\nError:'), error.message);
    return true;
  }
}

/**
 * Main application entry point
 */
async function main() {
  try {
    console.log(chalk.blue('🚀 Starting Vibe CLI...'));
    
    // Initialize the CLI
    await cli.initialize();
    
    // Check if we have command line arguments
    const args = process.argv.slice(2);
    
    if (args.length > 0) {
      // Try to handle as direct command
      const handled = await handleDirectCommand(args);
      if (handled) {
        process.exit(0);
      }
      // If not handled, fall through to interactive mode
      console.log('');
    }
    
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
  // Check for required environment variables
  if (!process.env.OPENAI_API_KEY && !process.env.ANTHROPIC_API_KEY && !process.env.GEMINI_API_KEY) {
    console.error(chalk.red('\n❌ Error: No API key found. Please set one of the following environment variables:'));
    console.error(chalk.yellow('  - OPENAI_API_KEY'));
    console.error(chalk.yellow('  - ANTHROPIC_API_KEY'));
    console.error(chalk.yellow('  - GEMINI_API_KEY'));
    console.error('\nYou can create a .env file in the project root with your API key.');
    process.exit(1);
  }
  
  main();
}

export { main };
