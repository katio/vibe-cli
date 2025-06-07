import { processQuery } from '../src/services/llm/index.js';
import { searchDocuments } from '../src/services/database.js';
import { fileURLToPath } from 'url';
import path from 'path';
import chalk from 'chalk';
import { TEST_CONFIG, validateConfig } from './config.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test configuration
const TEST_QUERIES = [
  'What is the main purpose of this project?',
  'Find database initialization code',
  'Show me the project structure',
  'What LLM providers are supported?'
];

// Validate configuration
validateConfig();

async function runTest(query) {
  console.log(chalk.blue('\n🔍 Query:'), chalk.bold(query));
  
  const context = {
    currentFolder: TEST_CONFIG.TEST_FOLDER,
    loadedFolders: [{
      id: 1,
      path: TEST_CONFIG.TEST_FOLDER,
      fileCount: 42,
      loadedAt: new Date().toISOString()
    }],
    config: {
      llmProvider: process.env.LLM_PROVIDER || 'openai',
      model: process.env[`${process.env.LLM_PROVIDER?.toUpperCase()}_MODEL`] || 'gpt-4-turbo'
    }
  };

  try {
    const response = await processQuery(query, context);
    
    // Format and display the response
    console.log('\n' + chalk.green('✅ Response:'));
    console.log('─'.repeat(80));
    
    // Simple markdown formatting
    const formatted = response
      .replace(/```vibemd\n([\s\S]*?)\n```/g, (_, code) => 
        chalk.gray('┌' + '─'.repeat(78) + '┐') + 
        '\n' + code.split('\n').map(line => chalk.gray('│ ') + line).join('\n') + 
        '\n' + chalk.gray('└' + '─'.repeat(78) + '┘')
      )
      .replace(/`([^`]+)`/g, chalk.cyan('$1'))
      .replace(/\*\*([^*]+)\*\*/g, chalk.bold('$1'))
      .replace(/\*([^*]+)\*/g, chalk.italic('$1'));
    
    console.log(formatted);
    console.log('─'.repeat(80));
    
  } catch (error) {
    console.error(chalk.red('\n❌ Error:'), error.message);
    if (process.env.NODE_ENV === 'development') {
      console.error(chalk.gray(error.stack));
    }
  }
}

// Run all test queries
async function runAllTests() {
  console.log(chalk.blue.bold('\n🚀 Starting Vibe CLI AI Test Suite\n'));
  
  for (const query of TEST_QUERIES) {
    await runTest(query);
    console.log('\n' + '='.repeat(80) + '\n');
  }
  
  console.log(chalk.green.bold('\n✅ All tests completed!\n'));
}

// Run the tests
runAllTests().catch(console.error);
