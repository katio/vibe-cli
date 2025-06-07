import { getEmbedding, getChatCompletion } from './providers.js';
import { tools, executeTool } from '../../tools/index.js';
import { SYSTEM_PROMPT } from '../../prompts/system.js';
import chalk from 'chalk';

const MAX_ITERATIONS = 5;

/**
 * Process a user query with tool calling
 * @param {string} query - User query
 * @param {Object} context - Additional context (current folder, etc.)
 * @returns {Promise<string>} Final response
 */
export async function processQuery(query, context = {}) {
  console.log(chalk.blue('\n🤖 Processing your query...'));
  
  let messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { 
      role: 'system', 
      content: `Current context:\n${JSON.stringify(context, null, 2)}`
    },
    { role: 'user', content: query }
  ];

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    // Get LLM response
    const response = await getChatCompletion(messages, {
      tools: Object.entries(tools).map(([name, { description, parameters }]) => ({
        type: 'function',
        function: { name, description, parameters }
      })),
      tool_choice: 'auto'
    });

    const { message } = response.choices[0];
    messages.push(message);

    // If no tool calls, we're done
    if (!message.tool_calls || message.tool_calls.length === 0) {
      return message.content || 'No response from the assistant.';
    }

    // Process tool calls
    const toolResults = await Promise.all(
      message.tool_calls.map(async (toolCall) => {
        const { name, arguments: args } = toolCall.function;
        console.log(chalk.gray(`\n🔧 Using tool: ${name}(${args})`));
        
        try {
          const result = await executeTool(name, JSON.parse(args));
          return {
            tool_call_id: toolCall.id,
            role: 'tool',
            name,
            content: JSON.stringify(result)
          };
        } catch (error) {
          console.error(chalk.red(`Error executing tool ${name}:`), error);
          return {
            tool_call_id: toolCall.id,
            role: 'tool',
            name,
            content: JSON.stringify({ error: error.message })
          };
        }
      })
    );

    // Add tool results to messages
    messages = [...messages, ...toolResults];
  }

  return 'Maximum iterations reached. Please try a more specific query.';
}

// For backward compatibility
export { getEmbedding, getChatCompletion };
