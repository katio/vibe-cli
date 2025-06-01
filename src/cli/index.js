import inquirer from 'inquirer';
import chalk from 'chalk';
import figlet from 'figlet';
import ora from 'ora';
import { fileURLToPath } from 'url';
import path from 'path';
import { db } from '../services/database.js';
import loadCommand from '../commands/load.js';
import askCommand from '../commands/ask.js';

// Command registry and state
const commands = new Map();
const commandAliases = {
  'l': 'load',
  'a': 'ask',
  'q': 'quit',
  'h': 'help',
  'f': 'folders',
  'u': 'use',
  'r': 'reset'
};

// Application state
const appState = {
  currentFolder: null,
  loadedFolders: new Map() // id -> { id, path, loadedAt }
};

let nextFolderId = 1;

/**
 * Register a new command
 * @param {string} name - Command name
 * @param {Object} command - Command object with handler and description
 * @param {string} [example] - Example usage
 */
function registerCommand(name, command, example = '') {
  commands.set(name, { ...command, example });
}

// Register commands
registerCommand('load', loadCommand, '/load /path/to/folder');
registerCommand('ask', askCommand, '/ask What is this project about?');
registerCommand('folders', {
  description: 'List all loaded folders',
  handler: listFolders
});

registerCommand('use', {
  description: 'Switch to a specific folder',
  handler: useFolder
}, '/use 1 or /use /path/to/folder');

registerCommand('reset', {
  description: 'Reset the database to default state',
  handler: resetDatabase
});

registerCommand('help', {
  description: 'Show help information',
  handler: showHelp
});

// Command handlers
async function listFolders() {
  if (appState.loadedFolders.size === 0) {
    console.log(chalk.yellow('\nNo folders loaded yet. Use /load to add a folder.'));
    return;
  }
  
  console.log(chalk.cyan('\nLoaded Folders:'));
  console.log(chalk.cyan('---------------'));
  
  let index = 1;
  for (const [id, folder] of appState.loadedFolders.entries()) {
    const isCurrent = appState.currentFolder === id ? chalk.green('(current)') : '';
    console.log(`${chalk.yellow(`${index}.`)} ${folder.path} ${chalk.gray(`(ID: ${id})`)} ${isCurrent}`);
    console.log(`   Loaded: ${new Date(folder.loadedAt).toLocaleString()}`);
    index++;
  }
  console.log('');
}

async function useFolder(folderIdOrPath) {
  if (!folderIdOrPath) {
    console.log(chalk.yellow('\nPlease specify a folder ID or path'));
    return;
  }
  
  // Try to find folder by ID
  const folderId = parseInt(folderIdOrPath, 10);
  if (!isNaN(folderId) && appState.loadedFolders.has(folderId)) {
    appState.currentFolder = folderId;
    console.log(chalk.green(`\nSwitched to folder: ${appState.loadedFolders.get(folderId).path}`));
    return;
  }
  
  // Try to find folder by path
  for (const [id, folder] of appState.loadedFolders.entries()) {
    if (folder.path === folderIdOrPath) {
      appState.currentFolder = id;
      console.log(chalk.green(`\nSwitched to folder: ${folder.path}`));
      return;
    }
  }
  
  console.log(chalk.yellow(`\nFolder not found: ${folderIdOrPath}`));
  console.log(chalk.gray('Use /folders to see available folders'));
}

async function resetDatabase() {
  const { confirm } = await inquirer.prompt([{
    type: 'confirm',
    name: 'confirm',
    message: 'Are you sure you want to reset the database? This will delete all data.',
    default: false
  }]);
  
  if (confirm) {
    const spinner = ora('Resetting database...').start();
    try {
      // Close the current database connection
      db.close();
      
      // Delete the database file
      const fs = await import('fs/promises');
      const dbPath = path.join(process.cwd(), 'vibe-db.sqlite');
      await fs.unlink(dbPath).catch(() => {});
      
      // Reinitialize the database
      await db.initialize();
      
      // Reset application state
      appState.currentFolder = null;
      appState.loadedFolders.clear();
      nextFolderId = 1;
      
      spinner.succeed('Database reset successfully');
    } catch (error) {
      spinner.fail('Failed to reset database');
      console.error(chalk.red('Error:'), error.message);
    }
  } else {
    console.log(chalk.yellow('\nDatabase reset cancelled'));
  }
}

/**
 * Display the welcome message
 */
function showWelcome() {
  console.log(chalk.blue(figlet.textSync('Vibe CLI', { horizontalLayout: 'full' })));
  
  const currentFolder = appState.currentFolder 
    ? appState.loadedFolders.get(appState.currentFolder)?.path 
    : null;
  
  if (currentFolder) {
    console.log(chalk.green(`Current folder: ${currentFolder}\n`));
  } else {
    console.log(chalk.yellow('No folder loaded. Use /load <folder> to get started.\n'));
  }
  
  console.log(chalk.gray('Type /help to see available commands\n'));
}

/**
 * Display help information
 */
function showHelp() {
  console.log(chalk.cyan('\nAvailable commands:'));
  console.log(chalk.cyan('------------------'));
  
  // Show full commands with descriptions and examples
  for (const [name, cmd] of commands.entries()) {
    const aliases = Object.entries(commandAliases)
      .filter(([_, cmdName]) => cmdName === name)
      .map(([alias]) => `/${alias}`)
      .join(', ');
    
    const aliasText = aliases ? chalk.gray(` (aliases: ${aliases})`) : '';
    console.log(chalk.yellow(`/${name}`) + aliasText + ` - ${cmd.description}`);
    
    if (cmd.example) {
      console.log(`  ${chalk.gray('Example:')} ${chalk.cyan(cmd.example)}`);
    }
  }
  
  // Show exit commands
  console.log('\n' + chalk.gray('Other commands:'));
  console.log(chalk.yellow('/exit, /quit, /q') + ' - Exit the application');
  
  // Show current folder status
  if (appState.currentFolder) {
    const folder = appState.loadedFolders.get(appState.currentFolder);
    console.log('\n' + chalk.green(`Current folder: ${folder.path}`));
  }
  
  console.log('');
}

/**
 * Parse command input
 * @param {string} input - User input
 * @returns {Object} Parsed command
 */
function parseCommand(input) {
  // If input is empty, return empty command
  if (!input || !input.trim()) {
    return { name: '', args: [] };
  }
  
  // If input doesn't start with '/', treat it as an ask command
  if (!input.startsWith('/')) {
    return { name: 'ask', args: [input] };
  }
  
  const parts = input.trim().split(/\s+/);
  let name = parts[0].substring(1).toLowerCase(); // Remove leading / and convert to lowercase
  
  // Resolve command aliases
  if (commandAliases[name]) {
    name = commandAliases[name];
  }
  
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
        const currentFolder = appState.currentFolder 
          ? appState.loadedFolders.get(appState.currentFolder)?.path 
          : null;
        
        const { input } = await inquirer.prompt([
          {
            type: 'input',
            name: 'input',
            message: chalk.blue(currentFolder ? `[${currentFolder}] >` : '>'),
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
    if (!input || !input.trim()) return;
    
    try {
      // Handle exit commands
      if (['exit', 'quit', 'q'].includes(input.toLowerCase().replace(/^\//, ''))) {
        console.log(chalk.blue('\n👋 Goodbye!'));
        process.exit(0);
      }
      
      // Parse the command
      const { name, args } = parseCommand(input);
      
      // Handle empty command (shouldn't happen due to validation)
      if (!name) return;
      
      // Handle help command
      if (name === 'help' || name === 'h') {
        showHelp();
        return;
      }
      
      // Check if a folder is required
      const folderRequired = ['ask', 'a'].includes(name);
      if (folderRequired && !appState.currentFolder) {
        console.log(chalk.yellow('\nNo folder selected. Please load a folder first:'));
        console.log(chalk.cyan('  /load /path/to/your/folder'));
        console.log(chalk.gray('Example: /load /home/user/projects/my-project\n'));
        return;
      }
      
      // Execute the command if it exists
      if (commands.has(name)) {
        const command = commands.get(name);
        try {
          await command.handler(...args);
        } catch (error) {
          console.error(chalk.red(`\nError executing command /${name}:`), error.message);
        }
      } else if (name === 'ask' || name === 'a') {
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
    } catch (error) {
      console.error(chalk.red('\nError:'), error.message);
    }
  }
}

// Create and export a singleton instance
const cli = new VibeCLI();

export { 
  cli as default, 
  VibeCLI, 
  appState, 
  nextFolderId,
  listFolders,
  useFolder,
  resetDatabase
};
