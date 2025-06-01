import inquirer from 'inquirer';
import path from 'path';
import { processDirectory } from '../services/documentProcessor.js';
import ora from 'ora';
import chalk from 'chalk';
import fs from 'fs';

/**
 * Load command handler
 * @param {string} dirPath - Path to the directory to load
 */
export async function loadCommand(dirPath) {
  try {
    const spinner = ora('Scanning directory...').start();
    
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
    
    spinner.text = `Loading directory: ${resolvedPath}`;
    
    // Process the directory
    const result = await processDirectory(resolvedPath, (current, total, file) => {
      spinner.text = `Processing files: ${current}/${total} - ${path.basename(file)}`;
    });
    
    if (result.success) {
      spinner.succeed(chalk.green(`Successfully processed ${result.processedFiles} files`));
    } else {
      spinner.fail(chalk.red('Failed to process directory'));
      console.error(chalk.red(result.error));
    }
    
  } catch (error) {
    console.error(chalk.red('Error in load command:'), error.message);
  }
}

export default {
  command: 'load [dirPath]',
  description: 'Load a directory of documents for indexing',
  handler: loadCommand
};
