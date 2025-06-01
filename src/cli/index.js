import inquirer from 'inquirer';
import chalk from 'chalk';
import figlet from 'figlet';
import ora from 'ora';
import { db } from '../services/database.js';
import loadCommand from '../commands/load.js';
import askCommand from '../commands/ask.js';

// Command registry
const commands = new Map();

/**
 * Register a new command
 * @param {string} name - Command name
 * @param {Object} command - Command object with handler and description
 */
function registerCommand(name, command) {
  commands.set(name, command);
}

// Register commands
registerCommand('load', loadCommand);
registerCommand('ask', askCommand);

/**
 * Display the welcome message
 */
function showWelcome() {
  console.log(chalk.blue(figlet.textSync('Vibe CLI', { horizontalLayout: 'full' })));
  console.log(chalk.gray('Type /help to see available commands\n'));
}

/**
 * Display help information
 */
function showHelp() {
  console.log(chalk.cyan('\nAvailable commands:'));
  console.log(chalk.cyan('------------------'));
  
  for (const [name, cmd] of commands.entries()) {
    console.log(chalk.yellow(`/${name}`) + ` - ${cmd.description}`);
  }
  
  console.log(chalk.yellow('/exit, /quit, /q') + ' - Exit the application');
  console.log(chalk.yellow('/help') + ' - Show this help message\n');
}

/**
 * Parse command input
 * @param {string} input - User input
 * @returns {Object} Parsed command
 */
function parseCommand(input) {
  if (!input || !input.startsWith('/')) {
    return { name: 'ask', args: [input] };
  }
  
  const parts = input.trim().split(/\s+/);
  const name = parts[0].substring(1); // Remove leading /
  const args = parts.slice(1);
  
  return { name, args };
}

/**
 * Main CLI class
 */
class VibeCLI {
  constructor() {
    this.running = false;
  }

  /**
   * Initialize the CLI
   */
  async initialize() {
    try {
      // Initialize database
      const spinner = ora('Initializing database...').start();
      await db.initialize();
      spinner.succeed('Database initialized');
      
      this.running = true;
    } catch (error) {
      console.error(chalk.red('❌ Failed to initialize:'), error.message);
      process.exit(1);
    }
  }
  
  /**
   * Start the interactive CLI
   */
  async start() {
    showWelcome();
    
    while (this.running) {
      try {
        const { input } = await inquirer.prompt([
          {
            type: 'input',
            name: 'input',
            message: chalk.blue('>'),
            prefix: '',
            validate: (value) => {
              if (!value.trim()) return 'Please enter a command or question';
              return true;
            },
          },
        ]);
        
        await this.handleInput(input.trim());
      } catch (error) {
        console.error(chalk.red('\nError:'), error.message);
      }
    }
  }
  
  /**
   * Handle user input
   * @param {string} input - User input
   */
  async handleInput(input) {
    // Handle empty input
    if (!input) return;
    
    // Handle exit commands
    if (['/exit', '/quit', '/q'].includes(input.toLowerCase())) {
      console.log(chalk.blue('\n👋 Goodbye!'));
      process.exit(0);
    }
    
    // Handle help command
    if (input.toLowerCase() === '/help') {
      showHelp();
      return;
    }
    
    // Parse the command
    const { name, args } = parseCommand(input);
    
    // Execute the command if it exists
    if (commands.has(name)) {
      const command = commands.get(name);
      try {
        await command.handler(...args);
      } catch (error) {
        console.error(chalk.red(`\nError executing command /${name}:`), error.message);
      }
    } else if (name === 'ask') {
      // Handle direct questions
      try {
        await askCommand.handler(args.join(' '));
      } catch (error) {
        console.error(chalk.red('\nError:'), error.message);
      }
    } else {
      console.log(chalk.yellow(`\nUnknown command: /${name}`));
      console.log(chalk.gray('Type /help to see available commands\n'));
    }
  }
}

// Create and export a singleton instance
const cli = new VibeCLI();

export { cli as default, VibeCLI };
