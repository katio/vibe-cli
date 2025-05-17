import { OpenAI } from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config/config.js';
import { logger } from '../utils/logger.js';

export class LLMService {
  constructor() {
    this.provider = config.activeProvider;
    this.embeddingProvider = config.embeddingProvider;
    this.models = config.llmModels;
    this.clients = this.initializeClients();
  }

  initializeClients() {
    const clients = {};

    // Initialize OpenAI client if API key is available
    if (config.apiKeys.openai) {
      clients.openai = new OpenAI({
        apiKey: config.apiKeys.openai,
      });
    }

    // Initialize Anthropic client if API key is available
    if (config.apiKeys.anthropic) {
      clients.anthropic = new Anthropic({
        apiKey: config.apiKeys.anthropic,
      });
    }

    // Initialize Google Gemini client if API key is available
    if (config.apiKeys.gemini) {
      clients.gemini = new GoogleGenerativeAI(config.apiKeys.gemini);
    }

    return clients;
  }

  /**
   * Generate an embedding for the given text
   * @param {string} text - The text to generate an embedding for
   * @returns {Promise<number[]>} - The embedding vector
   */
  async getEmbedding(text) {
    try {
      const embeddingProvider = this.clients[this.embeddingProvider];
      
      if (!embeddingProvider) {
        throw new Error(`No client available for embedding provider: ${this.embeddingProvider}`);
      }

      switch (this.embeddingProvider) {
        case 'openai': {
          const response = await embeddingProvider.embeddings.create({
            model: this.models.openai.embeddingModel,
            input: text,
          });
          return response.data[0].embedding;
        }
        case 'gemini': {
          const model = embeddingProvider.getGenerativeModel({ model: this.models.gemini.embeddingModel });
          const result = await model.embedContent(text);
          return result.embedding.values;
        }
        default:
          throw new Error(`Unsupported embedding provider: ${this.embeddingProvider}`);
      }
    } catch (error) {
      logger.error(`Error generating embedding: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate a chat completion
   * @param {Array<{role: string, content: string}>} messages - The chat messages
   * @param {Object} options - Additional options
   * @returns {Promise<string>} - The generated response
   */
  async chatCompletion(messages, options = {}) {
    try {
      const client = this.clients[this.provider];
      
      if (!client) {
        throw new Error(`No client available for provider: ${this.provider}`);
      }

      const model = this.models[this.provider].chatModel;
      const temperature = options.temperature || 0.7;
      const maxTokens = options.maxTokens || 2000;

      switch (this.provider) {
        case 'openai': {
          const response = await client.chat.completions.create({
            model,
            messages,
            temperature,
            max_tokens: maxTokens,
          });
          return response.choices[0].message.content;
        }
        case 'anthropic': {
          // Convert messages to Claude's format
          const systemMessage = messages.find(m => m.role === 'system')?.content || '';
          const claudeMessages = messages
            .filter(m => m.role !== 'system')
            .map(m => ({
              role: m.role === 'assistant' ? 'assistant' : 'user',
              content: m.content,
            }));

          const response = await client.messages.create({
            model,
            system: systemMessage,
            messages: claudeMessages,
            max_tokens: maxTokens,
            temperature,
          });

          return response.content[0].text;
        }
        case 'gemini': {
          const geminiModel = client.getGenerativeModel({ model });
          
          // Convert messages to Gemini's format
          const systemMessage = messages.find(m => m.role === 'system')?.content || '';
          const chatMessages = messages
            .filter(m => m.role !== 'system')
            .map(m => ({
              role: m.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: m.content }],
            }));
          
          // Start a chat session
          const chat = geminiModel.startChat({
            history: [
              {
                role: 'user',
                parts: [{ text: systemMessage }],
              },
              {
                role: 'model',
                parts: [{ text: 'I understand and will assist you with your request.' }],
              },
              ...chatMessages.slice(0, -1), // All messages except the last one
            ],
            generationConfig: {
              maxOutputTokens: maxTokens,
              temperature,
            },
          });
          
          // Send the last message
          const lastMessage = chatMessages[chatMessages.length - 1];
          const result = await chat.sendMessage(lastMessage.parts[0].text);
          return result.response.text();
        }
        default:
          throw new Error(`Unsupported provider: ${this.provider}`);
      }
    } catch (error) {
      logger.error(`Error in chat completion: ${error.message}`);
      throw error;
    }
  }

  /**
   * Ask a question about the codebase
   * @param {string} question - The user's question
   * @param {Array<{text: string, file_path: string}>} context - Relevant context chunks
   * @returns {Promise<string>} - The generated answer
   */
  async askQuestion(question, context = []) {
    try {
      const systemMessage = `You are a helpful AI assistant that helps with software development. 
You have access to the codebase and can answer questions about it. Be concise and accurate in your responses.
If you don't know the answer, say so rather than making something up.`;

      // Format the context for the prompt
      let contextText = '';
      if (context && context.length > 0) {
        contextText = '\n\nRelevant context from the codebase:\n';
        contextText += context
          .map((item, index) => `--- Context ${index + 1} (from ${item.file_path}):\n${item.chunk_text}`)
          .join('\n\n');
      }

      const messages = [
        { role: 'system', content: systemMessage },
        { role: 'user', content: `${question}${contextText}` },
      ];

      return await this.chatCompletion(messages);
    } catch (error) {
      logger.error(`Error asking question: ${error.message}`);
      throw error;
    }
  }
}

// Export a singleton instance
export const llmService = new LLMService();
