import inquirer from 'inquirer';
import path from 'path';
import { processDirectory } from '../services/documentProcessor.js';
import ora from 'ora';
import chalk from 'chalk';
import fs from 'fs';
import { fileURLToPath } from 'url';
/**
 * Load command handler
 * @param {string} dirPath - Path to the directory to load
 * @param {Object} appState - The application state
 * @param {number} nextFolderId - The next folder ID to use
 */
export async function loadCommand(dirPath, appState, nextFolderId) {
  const spinner = ora('Scanning directory...').start();
  
  try {
    // If no path provided, prompt for it
    if (!dirPath) {
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'dirPath',
          message: 'Enter the directory path to load:',
          default: '.',
          validate: (input) => {
            try {
              const resolvedPath = path.resolve(process.cwd(), input || '.');
              if (!fs.existsSync(resolvedPath)) {
                return 'Directory does not exist';
              }
              if (!fs.lstatSync(resolvedPath).isDirectory()) {
                return 'Path is not a directory';
              }
              return true;
            } catch (error) {
              return 'Error accessing directory';
            }
          }
        }
      ]);
      dirPath = answers.dirPath;
    }
    
    const resolvedPath = path.resolve(process.cwd(), dirPath);
    
    // Check if folder is already loaded
    for (const [id, folder] of appState.loadedFolders.entries()) {
      if (path.normalize(folder.path) === path.normalize(resolvedPath)) {
        spinner.info(`Folder already loaded (ID: ${id})`);
        appState.currentFolder = id;
        console.log(chalk.green(`\nUsing folder: ${resolvedPath}`));
        return;
      }
    }
    
    spinner.text = `Loading directory: ${resolvedPath}`;
    
    // Process the directory
    const result = await processDirectory(resolvedPath, (current, total, file) => {
      spinner.text = `Processing files: ${current}/${total} - ${path.basename(file)}`;
    });
    
    if (result.success) {
      // Add to loaded folders
      const folderId = nextFolderId++;
      const now = new Date();
      
      appState.loadedFolders.set(folderId, {
        id: folderId,
        path: resolvedPath,
        loadedAt: now.toISOString(),
        fileCount: result.processedFiles
      });
      
      // Set as current folder
      appState.currentFolder = folderId;
      
      spinner.succeed(chalk.green(`Successfully processed ${result.processedFiles} files`));
      console.log(chalk.green(`\nFolder loaded successfully (ID: ${folderId})`));
      console.log(chalk.green(`Current folder set to: ${resolvedPath}\n`));
    } else {
      spinner.fail(chalk.red('Failed to process directory'));
      console.error(chalk.red(result.error));
    }
    
  } catch (error) {
    spinner.fail('Failed to load directory');
    console.error(chalk.red('\nError:'), error.message);
  }
}

export default {
  command: 'load [dirPath]',
  description: 'Load a directory of documents for indexing',
  handler: loadCommand
};
