import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { getEmbedding, getChatCompletion } from '../services/llm.js';
import { db } from '../services/database.js';
import { getConfig } from '../config/index.js';

/**
 * Ask a question and get an answer based on the indexed documents
 * @param {string} question - The question to ask
 */
async function askCommand(question) {
  const config = getConfig();
  
  // If no question provided, prompt for it
  if (!question) {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'question',
        message: 'What would you like to know?',
        validate: (input) => input.trim().length > 0 || 'Please enter a question'
      }
    ]);
    question = answers.question;
  }
  const spinner = ora('Thinking...').start();
  
  try {
    // Initialize database if not already done
    await db.initialize();
    
    // Generate embedding for the question
    spinner.text = 'Understanding your question...';
    const questionEmbedding = await getEmbedding(question);
    
    // Get relevant context
    spinner.text = 'Finding relevant context...';
    const context = db.findSimilarDocuments(questionEmbedding, config.maxSimilarDocuments || 5);
    
    if (context.length === 0) {
      spinner.fail('No relevant context found in the knowledge base');
      return;
    }
    
    // Construct prompt with context
    const messages = [
      {
        role: 'system',
        content: `You are a helpful AI coding assistant. Answer the user's question based on the provided context.
` +
                `- If the context doesn't contain enough information, say so.
` +
                `- Be concise but thorough in your response.
` +
                `- Format code examples clearly with appropriate syntax highlighting.
` +
                `- If you're not sure about something, say so rather than making assumptions.`
      },
      {
        role: 'user',
        content: `Context from indexed documents:
${context.map((c, i) => `[Context ${i + 1} from ${c.file_path} (relevance: ${(1 - c.similarity).toFixed(2)})]:
${c.chunk_text}`).join('\n\n')}

Question: ${question}

Please provide a detailed answer based on the context above.`
      }
    ];
    
    // Get response from LLM
    spinner.text = 'Generating response...';
    const response = await getChatCompletion(messages);
    
    // Display response
    spinner.succeed('Response:');
    console.log('\n' + chalk.blue(response) + '\n');
    
    // Show sources with similarity scores
    console.log('\n' + chalk.gray('Sources (lower is better match):'));
    const sources = [...new Map(context.map(item => [item.file_path, item]))
      .values()]
      .sort((a, b) => a.similarity - b.similarity);
      
    sources.forEach((source, i) => {
      console.log(`  ${i + 1}. ${chalk.blue(source.file_path)} (relevance: ${(1 - source.similarity).toFixed(2)})`);
    });
    console.log();
    
  } catch (error) {
    spinner.fail('Error generating response');
    console.error(chalk.red(error.message));
  }
}

// Export command for CLI
export default {
  command: 'ask [question]',
  description: 'Ask a question about the indexed documents',
  handler: askCommand
};
