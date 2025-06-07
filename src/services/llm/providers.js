import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { getConfig } from '../../config/index.js';

const config = getConfig();

// Initialize clients
const openai = new OpenAI({
  apiKey: config.openai?.apiKey || process.env.OPENAI_API_KEY
});

const anthropic = new Anthropic({
  apiKey: config.anthropic?.apiKey || process.env.ANTHROPIC_API_KEY
});

/**
 * Get text embedding using the configured provider
 * @param {string} text - Text to embed
 * @returns {Promise<number[]>} Embedding vector
 */
export async function getEmbedding(text) {
  if (config.llm.provider === 'openai') {
    const response = await openai.embeddings.create({
      model: config.openai.embeddingModel || 'text-embedding-3-small',
      input: text
    });
    return response.data[0].embedding;
  } else if (config.llm.provider === 'anthropic') {
    // Anthropic doesn't have a direct embedding API, so we'll use their completion API
    // This is a simplified example - in production, you might want to use a different approach
    const response = await anthropic.messages.create({
      model: config.anthropic.model || 'claude-3-opus-20240229',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `Generate a semantic embedding for the following text in JSON array format: ${text}`
        }
      ]
    });
    // Parse the response - this is just an example
    return JSON.parse(response.content[0].text);
  }
  throw new Error('Unsupported LLM provider');
}

/**
 * Get chat completion with optional tool calling
 * @param {Array} messages - Array of message objects
 * @param {Object} options - Options including tools and tool_choice
 * @returns {Promise<Object>} Completion response
 */
export async function getChatCompletion(messages, options = {}) {
  const { tools = [], tool_choice = 'auto' } = options;
  
  if (config.llm.provider === 'openai') {
    return openai.chat.completions.create({
      model: config.openai.model || 'gpt-4-turbo',
      messages,
      tools: tools.length > 0 ? tools : undefined,
      tool_choice: tools.length > 0 ? tool_choice : undefined,
      temperature: 0.7,
    });
  } else if (config.llm.provider === 'anthropic') {
    // Anthropic's tool use is different - this is a simplified example
    const response = await anthropic.messages.create({
      model: config.anthropic.model || 'claude-3-opus-20240229',
      max_tokens: 4096,
      messages,
      // Anthropic's tool use format is different - this is a simplified example
      tools: tools.length > 0 ? {
        tool_use: tools
      } : undefined
    });
    return { choices: [{ message: response }] };
  }
  throw new Error('Unsupported LLM provider');
}

export default {
  getEmbedding,
  getChatCompletion
};
