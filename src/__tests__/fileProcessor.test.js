import { describe, it, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import { FileProcessor } from '../services/fileProcessor.js';
import { Database } from '../services/database.js';
import { LLMService } from '../services/llm.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mock LLMService
class MockLLMService {
  async getEmbedding() {
    return new Array(1536).fill(0.1); // Return a mock embedding
  }
}

describe('FileProcessor', () => {
  let fileProcessor;
  let db;
  let testDbPath;
  
  beforeAll(async () => {
    // Set up test database
    testDbPath = path.join(__dirname, '../../test-db.sqlite');
    
    // Clean up any existing test database
    try {
      await fs.unlink(testDbPath);
    } catch (error) {
      // Ignore if file doesn't exist
    }
    
    // Initialize database with test path
    db = new Database();
    db.dbPath = testDbPath;
    await db.initialize();
    
    // Initialize file processor with mock LLM service
    fileProcessor = new FileProcessor({
      db,
      llmService: new MockLLMService()
    });
  });
  
  afterAll(async () => {
    // Clean up test database
    if (db) {
      await db.close();
    }
    try {
      await fs.unlink(testDbPath);
    } catch (error) {
      // Ignore if file doesn't exist
    }
  });
  
  describe('chunkText', () => {
    it('should split long text into chunks', () => {
      const longText = 'a '.repeat(1000) + '\n\n' + 'b '.repeat(1000);
      const chunks = fileProcessor.chunkText(longText);
      
      expect(chunks.length).toBeGreaterThan(1);
      chunks.forEach(chunk => {
        expect(chunk.text.length).toBeLessThanOrEqual(1500);
        expect(chunk.text.trim().length).toBeGreaterThan(0);
      });
    });
    
    it('should handle empty text', () => {
      const chunks = fileProcessor.chunkText('');
      expect(chunks).toEqual([]);
    });
  });
  
  describe('chunkCode', () => {
    it('should split code into chunks', () => {
      const code = `
        function test() {
          console.log('Hello, world!');
          return 42;
        }
        
        class Test {
          constructor() {
            this.value = 42;
          }
          
          getValue() {
            return this.value;
          }
        }
      `;
      
      const chunks = fileProcessor.chunkCode(code);
      
      expect(chunks.length).toBeGreaterThan(0);
      chunks.forEach(chunk => {
        expect(chunk.text.length).toBeLessThanOrEqual(1500);
        expect(chunk.text.trim().length).toBeGreaterThan(0);
      });
    });
    
    it('should handle empty code', () => {
      const chunks = fileProcessor.chunkCode('');
      expect(chunks).toEqual([]);
    });
  });
  
  describe('processFile', () => {
    let testFilePath;
    
    beforeEach(async () => {
      // Create a temporary test file
      testFilePath = path.join(__dirname, 'test-file.txt');
      await fs.writeFile(testFilePath, 'This is a test file.\nIt has multiple lines.\n\nAnd paragraphs.');
    });
    
    afterEach(async () => {
      // Clean up test file
      try {
        await fs.unlink(testFilePath);
      } catch (error) {
        // Ignore if file doesn't exist
      }
    });
    
    it('should process a text file', async () => {
      const chunks = await fileProcessor.processFile(testFilePath);
      
      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[0]).toHaveProperty('text');
      expect(chunks[0]).toHaveProperty('metadata');
    });
    
    it('should skip already processed files', async () => {
      // Process once
      await fileProcessor.processFile(testFilePath);
      
      // Process again
      const chunks = await fileProcessor.processFile(testFilePath);
      
      // Should return empty array as file was already processed
      expect(chunks).toEqual([]);
    });
  });
  
  describe('processDirectory', () => {
    let testDirPath;
    
    beforeAll(async () => {
      // Create a temporary test directory with some files
      testDirPath = path.join(__dirname, 'test-dir');
      await fs.mkdir(testDirPath, { recursive: true });
      
      // Create some test files
      await fs.writeFile(path.join(testDirPath, 'test1.txt'), 'Test file 1');
      await fs.writeFile(path.join(testDirPath, 'test2.js'), 'function test() { return 42; }');
      await fs.mkdir(path.join(testDirPath, 'subdir'), { recursive: true });
      await fs.writeFile(path.join(testDirPath, 'subdir', 'test3.md'), '# Test Markdown\n\nWith some content');
    });
    
    afterAll(async () => {
      // Clean up test directory
      try {
        await fs.rm(testDirPath, { recursive: true, force: true });
      } catch (error) {
        // Ignore if directory doesn't exist
      }
    });
    
    it('should process all files in a directory', async () => {
      const originalLog = console.log;
      console.log = jest.fn(); // Mock console.log
      
      try {
        await fileProcessor.processDirectory(testDirPath);
        
        // Verify that files were processed
        const files = await fileProcessor.db.db.all('SELECT DISTINCT file_path FROM documents');
        expect(files.length).toBe(3); // 3 test files
      } finally {
        console.log = originalLog; // Restore console.log
      }
    });
    
    it('should respect ignored directories', async () => {
      // Create a node_modules directory with a file
      await fs.mkdir(path.join(testDirPath, 'node_modules'), { recursive: true });
      await fs.writeFile(path.join(testDirPath, 'node_modules', 'test-lib.js'), '// Test library');
      
      const originalLog = console.log;
      console.log = jest.fn(); // Mock console.log
      
      try {
        await fileProcessor.processDirectory(testDirPath);
        
        // Verify that files in node_modules were ignored
        const files = await fileProcessor.db.db.all(
          'SELECT file_path FROM documents WHERE file_path LIKE ?',
          ['%node_modules%']
        );
        
        expect(files.length).toBe(0);
      } finally {
        console.log = originalLog; // Restore console.log
        
        // Clean up
        try {
          await fs.rm(path.join(testDirPath, 'node_modules'), { recursive: true, force: true });
        } catch (error) {
          // Ignore if directory doesn't exist
        }
      }
    });
  });
});
