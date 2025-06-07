#!/usr/bin/env node

import inquirer from 'inquirer';
import chalk from 'chalk';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const execAsync = promisify(exec);

const ENV_FILE = path.join(process.cwd(), '.env');
const ENV_EXAMPLE_FILE = path.join(process.cwd(), '.env.example');

async function checkEnvFile() {
  if (!fs.existsSync(ENV_FILE)) {
    console.log(chalk.yellow('⚠️  No .env file found. Creating one from example...'));
    
    if (fs.existsSync(ENV_EXAMPLE_FILE)) {
      fs.copyFileSync(ENV_EXAMPLE_FILE, ENV_FILE);
      console.log(chalk.green('✅ Created .env file from example'));
    } else {
      console.error(chalk.red('❌ .env.example file not found. Please create it first.'));
      process.exit(1);
    }
  }
  
  // Load the .env file
  require('dotenv').config();
}

async function checkApiKeys() {
  const requiredVars = [
    'OPENAI_API_KEY',
    'ANTHROPIC_API_KEY',
    'GEMINI_API_KEY'
  ];
  
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length === requiredVars.length) {
    console.log(chalk.red('❌ No API keys found in .env file'));
    console.log(chalk.yellow('\nPlease add at least one of the following to your .env file:'));
    console.log(chalk.cyan('OPENAI_API_KEY=your_openai_key'));
    console.log(chalk.cyan('ANTHROPIC_API_KEY=your_anthropic_key'));
    console.log(chalk.cyan('GEMINI_API_KEY=your_gemini_key'));
    process.exit(1);
  }
  
  // Set the default provider if not set
  if (!process.env.LLM_PROVIDER) {
    if (process.env.OPENAI_API_KEY) process.env.LLM_PROVIDER = 'openai';
    else if (process.env.ANTHROPIC_API_KEY) process.env.LLM_PROVIDER = 'anthropic';
    else if (process.env.GEMINI_API_KEY) process.env.LLM_PROVIDER = 'gemini';
  }
  
  console.log(chalk.green(`✅ Using ${process.env.LLM_PROVIDER.toUpperCase()} as the LLM provider`));
}

async function runTests() {
  console.log('\n' + chalk.blue.bold('🚀 Running Vibe CLI AI Tests'));
  console.log('='.repeat(50) + '\n');
  
  try {
    // Run the test script
    const { stdout, stderr } = await execAsync('node test/test-ai.js');
    
    console.log(stdout);
    if (stderr) console.error(chalk.yellow(stderr));
    
    console.log(chalk.green.bold('✅ All tests completed successfully!\n'));
  } catch (error) {
    console.error(chalk.red('❌ Test failed:'), error.message);
    if (error.stderr) console.error(chalk.red(error.stderr));
    process.exit(1);
  }
}

async function main() {
  console.log(chalk.blue.bold('\n🔍 Vibe CLI AI Test Runner\n'));
  
  try {
    await checkEnvFile();
    await checkApiKeys();
    
    const { action } = await inquirer.prompt([{
      type: 'list',
      name: 'action',
      message: 'What would you like to do?',
      choices: [
        { name: 'Run all tests', value: 'run' },
        { name: 'Check configuration', value: 'check' },
        { name: 'Exit', value: 'exit' }
      ]
    }]);
    
    switch (action) {
      case 'run':
        await runTests();
        break;
      case 'check':
        console.log('\n' + chalk.green('✅ Configuration looks good!'));
        console.log(chalk.cyan('LLM Provider:'), process.env.LLM_PROVIDER);
        break;
      case 'exit':
        console.log(chalk.blue('\n👋 Goodbye!'));
        process.exit(0);
    }
    
  } catch (error) {
    console.error(chalk.red('\n❌ Error:'), error.message);
    process.exit(1);
  }
}

// Run the main function
main();
