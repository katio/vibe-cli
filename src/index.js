#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import figlet from 'figlet';
import dotenv from 'dotenv';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { Command } from 'commander';
import { config } from './config/config.js';
import { Database } from './services/database.js';
import { LLMService } from './services/llm.js';
import { FileProcessor } from './services/fileProcessor.js';
import { logger } from './utils/logger.js';

// Initialize environment variables
dotenv.config();

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize services
const db = new Database();
const llmService = new LLMService();
const fileProcessor = new FileProcessor({ db, llmService });

// Display banner
const displayBanner = () => {
  console.log(
    chalk.blue(
      figlet.textSync('VIBE CLI', { horizontalLayout: 'full' })
    )
  );
  console.log(chalk.green('  Vibe Coding Assistant - Your AI Pair Programmer\n'));
};

// Main CLI function
const main = async () => {
  displayBanner();

  const program = new Command();

  program
    .version('1.0.0')
    .description('Vibe CLI - Your AI Pair Programmer')
    .option('-v, --verbose', 'Enable verbose output')
    .option('--debug', 'Enable debug mode');

  // Load command
  program
    .command('load <path>')
    .description('Load a directory into the knowledge base')
    .action(async (dirPath) => {
      try {
        logger.info(`Loading directory: ${dirPath}`);
        await fileProcessor.processDirectory(dirPath);
        logger.success('Successfully loaded directory');
      } catch (error) {
        logger.error(`Error loading directory: ${error.message}`);
        process.exit(1);
      }
    });

  // Ask command
  program
    .command('ask <question>')
    .description('Ask a question about your codebase')
    .action(async (question) => {
      try {
        logger.info('Processing your question...');
        const answer = await llmService.askQuestion(question);
        console.log('\n' + chalk.blue('Answer:') + '\n' + answer + '\n');
      } catch (error) {
        logger.error(`Error processing question: ${error.message}`);
        process.exit(1);
      }
    });

  // Interactive mode
  program.command('interactive').description('Start interactive mode').action(startInteractiveMode);

  // Handle unknown commands
  program.on('command:*', () => {
    console.error('Invalid command: %s\nSee --help for a list of available commands.', program.args.join(' '));
    process.exit(1);
  });

  // Show help if no arguments
  if (process.argv.length <= 2) {
    program.help();
  }

  program.parse(process.argv);
};

// Interactive mode
const startInteractiveMode = async () => {
  console.log('\n' + chalk.blue('Interactive Mode - Type /help for available commands'));
  
  const readline = (await import('readline')).createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'vibe> ',
  });

  readline.prompt();

  readline.on('line', async (line) => {
    const input = line.trim();
    
    if (input === '') {
      readline.prompt();
      return;
    }

    // Handle commands
    if (input.startsWith('/')) {
      const [command, ...args] = input.slice(1).split(' ');
      
      switch (command) {
        case 'load':
          if (args.length === 0) {
            console.log(chalk.red('Error: Please provide a directory path'));
          } else {
            try {
              await fileProcessor.processDirectory(args[0]);
              console.log(chalk.green('Successfully loaded directory'));
            } catch (error) {
              console.error(chalk.red(`Error: ${error.message}`));
            }
          }
          break;
          
        case 'ask':
        case 'c':
          if (args.length === 0) {
            console.log(chalk.red('Error: Please provide a question'));
          } else {
            try {
              const question = args.join(' ');
              const answer = await llmService.askQuestion(question);
              console.log('\n' + chalk.blue('Answer:') + '\n' + answer + '\n');
            } catch (error) {
              console.error(chalk.red(`Error: ${error.message}`));
            }
          }
          break;
          
        case 'help':
        case 'h':
          displayHelp();
          break;
          
        case 'exit':
        case 'quit':
        case 'q':
          console.log(chalk.blue('Goodbye! 👋'));
          process.exit(0);
          
        default:
          console.log(chalk.red(`Unknown command: ${command}. Type /help for available commands.`));
      }
    } else {
      // Handle natural language input as a question
      try {
        const answer = await llmService.askQuestion(input);
        console.log('\n' + chalk.blue('Answer:') + '\n' + answer + '\n');
      } catch (error) {
        console.error(chalk.red(`Error: ${error.message}`));
      }
    }
    
    readline.prompt();
  });

  readline.on('close', () => {
    console.log(chalk.blue('\nGoodbye! 👋'));
    process.exit(0);
  });
};

// Display help information
const displayHelp = () => {
  console.log('\n' + chalk.underline('Available Commands:') + '\n');
  console.log(chalk.blue('/load <path>') + '       - Load a directory into the knowledge base');
  console.log(chalk.blue('/ask <question>') + '    - Ask a question about your codebase');
  console.log(chalk.blue('/help') + '             - Show this help message');
  console.log(chalk.blue('/exit, /quit, /q') + '  - Exit the application');
  console.log('\nYou can also type questions directly without a command prefix.\n');
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (error) => {
  logger.error(`Unhandled rejection: ${error.message}`);
  process.exit(1);
});

// Start the application
main().catch((error) => {
  logger.error(`Fatal error: ${error.message}`);
  process.exit(1);
});
