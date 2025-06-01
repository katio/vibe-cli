import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { getEmbedding, getChatCompletion } from '../services/llm.js';
import { db } from '../services/database.js';
import { getConfig } from '../config/index.js';
import { appState } from '../cli/index.js';

/**
 * Ask a question and get an answer based on the indexed documents
 * @param {string} question - The question to ask
 */
async function askCommand(question) {
  const config = getConfig();
  const spinner = ora('Thinking...').start();
  
  try {
    // Check if we have a current folder
    if (!appState.currentFolder) {
      spinner.fail('No folder selected');
      console.log(chalk.yellow('\nPlease load a folder first using /load <folder>'));
      return;
    }
    
    const currentFolder = appState.loadedFolders.get(appState.currentFolder);
    
    // If no question provided, prompt for it
    if (!question) {
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'question',
          message: `Ask about ${currentFolder.path}:`,
          validate: (input) => input.trim().length > 0 || 'Please enter a question'
        }
      ]);
      question = answers.question;
    }
    
    spinner.text = 'Understanding your question...';
    
    // Initialize database if not already done
    await db.initialize();
    
    // Generate embedding for the question
    const questionEmbedding = await getEmbedding(question);
    
    // Get relevant context
    spinner.text = 'Searching in knowledge base...';
    const context = db.findSimilarDocuments(questionEmbedding, config.maxSimilarDocuments || 5);
    
    if (context.length === 0) {
      spinner.fail('No relevant information found in the knowledge base');
      console.log(chalk.yellow('\nTry loading more content or rephrasing your question.\n'));
      return;
    }
    
    // Construct prompt with context
    const messages = [
      {
        role: 'system',
        content: `You are a helpful AI coding assistant. Answer the user's question based on the provided context.
` +
                `- Current folder: ${currentFolder.path}\n` +
                `- If the context doesn't contain enough information, say so.\n` +
                `- Be concise but thorough in your response.\n` +
                `- Format code examples clearly with appropriate syntax highlighting.\n` +
                `- If you're not sure about something, say so rather than making assumptions.`
      },
      {
        role: 'user',
        content: `Context from indexed documents (${currentFolder.path}):\n` +
                `${context.map((c, i) => 
                  `[Context ${i + 1} from ${c.file_path.replace(currentFolder.path, '')} (relevance: ${(1 - c.similarity).toFixed(2)})]:\n` +
                  `${c.chunk_text}`
                ).join('\n\n')}\n\n` +
                `Question: ${question}\n\n` +
                `Please provide a detailed answer based on the context above.`
      }
    ];
    
    // Get response from LLM
    spinner.text = 'Generating response...';
    const response = await getChatCompletion(messages);
    
    // Display response
    spinner.succeed('Response:');
    console.log('\n' + chalk.blue(response) + '\n');
    
    // Show sources with similarity scores
    console.log(chalk.gray('Sources (relevance score, higher is better):'));
    const sources = [...new Map(context.map(item => [item.file_path, item]))
      .values()]
      .sort((a, b) => b.similarity - a.similarity);
    
    console.log(chalk.gray('┌' + '─'.repeat(80) + '┐'));
    sources.forEach((source, i) => {
      const relScore = (1 - source.similarity).toFixed(2);
      const relBar = '■'.repeat(Math.floor(relScore * 10));
      const relPercentage = Math.floor(relScore * 100);
      
      console.log(chalk.gray('│ ') + 
        `${i + 1}. ` + 
        chalk.cyan(source.file_path.replace(currentFolder.path, '.')) + 
        chalk.gray(`\n│    ${relBar} ${relPercentage}%`)
      );
      
      if (i < sources.length - 1) {
        console.log(chalk.gray('├' + '─'.repeat(80) + '┤'));
      }
    });
    console.log(chalk.gray('└' + '─'.repeat(80) + '┘\n'));
    
  } catch (error) {
    spinner.fail('Error generating response');
    console.error(chalk.red('\nError:'), error.message);
    
    if (error.response) {
      console.error(chalk.gray('Response data:'), error.response.data);
    }
    
    console.log('');
  }
}

// Export command for CLI
// Export command for CLI
export default {
  command: 'ask [question]',
  description: 'Ask a question about the indexed documents',
  handler: askCommand,
  example: '/ask How does this work?'
};

// Export for direct use
export { askCommand };
