import { describe, it, expect, beforeAll, afterAll, jest, beforeEach } from '@jest/globals';
import { LLMService } from '../services/llm.js';

// Mock the API clients
jest.mock('openai', () => ({
  OpenAI: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{
            message: {
              content: 'Mocked OpenAI response'
            }
          }]
        })
      }
    },
    embeddings: {
      create: jest.fn().mockResolvedValue({
        data: [{
          embedding: new Array(1536).fill(0.5)
        }]
      })
    }
  }))
}));

jest.mock('@anthropic-ai/sdk', () => ({
  default: jest.fn().mockImplementation(() => ({
    messages: {
      create: jest.fn().mockResolvedValue({
        content: [{
          text: 'Mocked Anthropic response'
        }]
      })
    }
  }))
}));

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: jest.fn().mockResolvedValue({
        response: {
          text: jest.fn().mockResolvedValue('Mocked Gemini response')
        }
      }),
      embedContent: jest.fn().mockResolvedValue({
        embedding: {
          values: new Array(768).fill(0.3)
        }
      }),
      startChat: jest.fn().mockReturnValue({
        sendMessage: jest.fn().mockResolvedValue({
          response: {
            text: jest.fn().mockResolvedValue('Mocked Gemini chat response')
          }
        })
      })
    })
  }))
}));

describe('LLMService', () => {
  let llmService;
  
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Create a new instance with test config
    llmService = new LLMService();
    
    // Override config for testing
    llmService.provider = 'openai';
    llmService.embeddingProvider = 'openai';
    llmService.models = {
      openai: {
        chatModel: 'gpt-3.5-turbo',
        embeddingModel: 'text-embedding-3-small',
        embeddingDimension: 1536
      },
      anthropic: {
        chatModel: 'claude-3-haiku-20240307',
        embeddingModel: null,
        embeddingDimension: null
      },
      gemini: {
        chatModel: 'gemini-1.5-flash-latest',
        embeddingModel: 'text-embedding-004',
        embeddingDimension: 768
      }
    };
    
    // Mock API keys
    llmService.clients = {
      openai: new (require('openai').OpenAI)(),
      anthropic: new (require('@anthropic-ai/sdk').default)(),
      gemini: new (require('@google/generative-ai').GoogleGenerativeAI)('test-key')
    };
  });
  
  describe('getEmbedding', () => {
    it('should get embedding from OpenAI', async () => {
      llmService.embeddingProvider = 'openai';
      
      const embedding = await llmService.getEmbedding('test text');
      
      expect(embedding).toBeInstanceOf(Array);
      expect(embedding.length).toBe(1536);
      expect(llmService.clients.openai.embeddings.create).toHaveBeenCalledWith({
        model: 'text-embedding-3-small',
        input: 'test text'
      });
    });
    
    it('should get embedding from Gemini', async () => {
      llmService.embeddingProvider = 'gemini';
      
      const embedding = await llmService.getEmbedding('test text');
      
      expect(embedding).toBeInstanceOf(Array);
      expect(embedding.length).toBe(768);
    });
    
    it('should throw error for unsupported provider', async () => {
      llmService.embeddingProvider = 'unsupported';
      
      await expect(llmService.getEmbedding('test')).rejects.toThrow(
        'Unsupported embedding provider: unsupported'
      );
    });
  });
  
  describe('chatCompletion', () => {
    it('should get completion from OpenAI', async () => {
      llmService.provider = 'openai';
      
      const messages = [
        { role: 'system', content: 'You are a helpful assistant' },
        { role: 'user', content: 'Hello' }
      ];
      
      const response = await llmService.chatCompletion(messages);
      
      expect(response).toBe('Mocked OpenAI response');
      expect(llmService.clients.openai.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-3.5-turbo',
          messages
        })
      );
    });
    
    it('should get completion from Anthropic', async () => {
      llmService.provider = 'anthropic';
      
      const messages = [
        { role: 'user', content: 'Hello' }
      ];
      
      const response = await llmService.chatCompletion(messages, { system: 'Be helpful' });
      
      expect(response).toBe('Mocked Anthropic response');
      expect(llmService.clients.anthropic.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-3-haiku-20240307',
          system: 'Be helpful',
          messages: [{ role: 'user', content: 'Hello' }]
        })
      );
    });
    
    it('should get completion from Gemini', async () => {
      llmService.provider = 'gemini';
      
      const messages = [
        { role: 'user', content: 'Hello' }
      ];
      
      const response = await llmService.chatCompletion(messages, { system: 'Be helpful' });
      
      expect(response).toBe('Mocked Gemini chat response');
      expect(llmService.clients.gemini.getGenerativeModel).toHaveBeenCalledWith({
        model: 'gemini-1.5-flash-latest'
      });
    });
  });
  
  describe('askQuestion', () => {
    it('should format question and context correctly', async () => {
      llmService.provider = 'openai';
      llmService.chatCompletion = jest.fn().mockResolvedValue('Test answer');
      
      const question = 'What is this about?';
      const context = [
        { text: 'Context 1', file_path: '/file1.txt' },
        { text: 'Context 2', file_path: '/file2.txt' }
      ];
      
      const answer = await llmService.askQuestion(question, context);
      
      expect(answer).toBe('Test answer');
      expect(llmService.chatCompletion).toHaveBeenCalledWith(
        [
          expect.objectContaining({
            role: 'system',
            content: expect.stringContaining('helpful AI assistant')
          }),
          {
            role: 'user',
            content: expect.stringContaining('What is this about?')
          }
        ],
        expect.any(Object)
      );
    });
  });
});
