import { searchDocuments } from '../services/database.js';
import fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import chalk from 'chalk';
import inquirer from 'inquirer';

const execAsync = promisify(exec);

/**
 * Search code using semantic similarity
 * @param {string} query - The search query
 * @param {number} [limit=5] - Maximum number of results
 * @returns {Promise<Array>} Search results
 */
async function searchCodebase({ query, limit = 5 }) {
  try {
    const results = await searchDocuments(query, limit);
    return {
      success: true,
      results: results.map(r => ({
        file_path: r.file_path,
        content: r.chunk_text,
        similarity: 1 - r.similarity,
        line_number: r.line_number
      }))
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Read file contents
 * @param {string} path - Path to the file
 * @returns {Promise<Object>} File contents
 */
async function readFile({ path }) {
  try {
    const content = await fs.readFile(path, 'utf-8');
    return { success: true, content };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Execute terminal command with user approval
 * @param {string} command - Command to execute
 * @returns {Promise<Object>} Command execution result
 */
async function executeCommand({ command }) {
  try {
    console.log(chalk.yellow(`\nCommand to execute:`));
    console.log(chalk.cyan(`  ${command}`));
    
    const { confirm } = await inquirer.prompt([{
      type: 'confirm',
      name: 'confirm',
      message: 'Execute this command?',
      default: false
    }]);

    if (confirm) {
      const { stdout, stderr } = await execAsync(command, { maxBuffer: 10 * 1024 * 1024 });
      return { 
        success: true, 
        stdout: stdout || '',
        stderr: stderr || ''
      };
    }
    return { success: false, message: 'Command execution cancelled by user' };
  } catch (error) {
    return { 
      success: false, 
      error: error.stderr || error.message,
      stdout: error.stdout || ''
    };
  }
}

export const tools = {
  searchCode: {
    description: "Search code using semantic similarity",
    parameters: { 
      query: { type: "string", description: "Search query" },
      limit: { type: "number", description: "Max results (default: 5)", optional: true }
    },
    execute: searchCodebase
  },
  readFile: {
    description: "Read file contents",
    parameters: { 
      path: { type: "string", description: "Path to the file" }
    },
    execute: readFile
  },
  executeCommand: {
    description: "Run terminal command (requires approval)",
    parameters: { 
      command: { type: "string", description: "Command to execute" }
    },
    execute: executeCommand
  }
};

export function getToolSchema() {
  return Object.entries(tools).reduce((acc, [name, { description, parameters }]) => {
    acc[name] = { description, parameters };
    return acc;
  }, {});
}

export async function executeTool(toolName, params) {
  const tool = tools[toolName];
  if (!tool) {
    throw new Error(`Unknown tool: ${toolName}`);
  }
  return tool.execute(params);
}
