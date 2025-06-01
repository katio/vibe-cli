import { OpenAI } from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getConfig } from '../config/index.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize LLM clients
let openai, anthropic, gemini;

if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

if (process.env.ANTHROPIC_API_KEY) {
  anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });
}

if (process.env.GEMINI_API_KEY) {
  gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
}

/**
 * Get embedding for a given text
 * @param {string} text - The text to get embedding for
 * @returns {Promise<number[]>} The embedding vector
 */
export async function getEmbedding(text) {
  const config = getConfig();
  const provider = config.activeProvider;
  
  try {
    if (provider === 'openai' && openai) {
      const response = await openai.embeddings.create({
        model: config.llmModels.openai.embeddingModel,
        input: text,
      });
      return response.data[0].embedding;
    } 
    
    if (provider === 'gemini' && gemini) {
      const model = gemini.getGenerativeModel({ model: 'embedding-001' });
      const result = await model.embedContent(text);
      return result.embedding.values;
    }
    
    throw new Error(`Unsupported or misconfigured provider for embeddings: ${provider}`);
  } catch (error) {
    console.error('Error getting embedding:', error);
    throw new Error(`Failed to get embedding: ${error.message}`);
  }
}

/**
 * Get chat completion from LLM
 * @param {Array} messages - Array of message objects with role and content
 * @returns {Promise<string>} The generated response
 */
export async function getChatCompletion(messages) {
  const config = getConfig();
  const provider = config.activeProvider;
  
  try {
    if (provider === 'openai' && openai) {
      const response = await openai.chat.completions.create({
        model: config.llmModels.openai.chatModel,
        messages,
        temperature: 0.7,
      });
      return response.choices[0].message.content;
    }
    
    if (provider === 'anthropic' && anthropic) {
      const response = await anthropic.messages.create({
        model: config.llmModels.anthropic.chatModel,
        messages,
        max_tokens: 1000,
      });
      return response.content[0].text;
    }
    
    if (provider === 'gemini' && gemini) {
      const model = gemini.getGenerativeModel({ model: config.llmModels.gemini.chatModel });
      const chat = model.startChat({
        history: messages.slice(0, -1).map(msg => ({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }],
        })),
      });
      const result = await chat.sendMessage(messages[messages.length - 1].content);
      return result.response.text();
    }
    
    throw new Error(`Unsupported or misconfigured provider: ${provider}`);
  } catch (error) {
    console.error('Error getting chat completion:', error);
    throw new Error(`Failed to get chat completion: ${error.message}`);
  }
}

export default {
  getEmbedding,
  getChatCompletion,
};
