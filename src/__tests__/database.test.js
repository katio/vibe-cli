import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { Database } from '../services/database.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Database', () => {
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
  
  afterEach(async () => {
    // Clear data between tests
    if (db) {
      await db.clearDatabase();
    }
  });
  
  describe('document operations', () => {
    it('should insert and retrieve a document', async () => {
      const filePath = '/test/file.txt';
      const chunkText = 'This is a test chunk';
      
      // Insert document
      const docId = await db.insertDocument(filePath, chunkText);
      expect(docId).toBeDefined();
      
      // Verify document was inserted
      const doc = await db.db.get('SELECT * FROM documents WHERE id = ?', [docId]);
      expect(doc).toBeDefined();
      expect(doc.file_path).toBe(filePath);
      expect(doc.chunk_text).toBe(chunkText);
    });
    
    it('should not insert duplicate documents', async () => {
      const filePath = '/test/duplicate.txt';
      const chunkText = 'Duplicate test';
      
      // Insert first time
      const docId1 = await db.insertDocument(filePath, chunkText);
      
      // Insert again
      const docId2 = await db.insertDocument(filePath, chunkText);
      
      // Should return the same ID for duplicate
      expect(docId1).toBe(docId2);
      
      // Should only be one record in the database
      const count = await db.db.get('SELECT COUNT(*) as count FROM documents');
      expect(count.count).toBe(1);
    });
  });
  
  describe('embedding operations', () => {
    it('should insert and retrieve an embedding', async () => {
      // First insert a document
      const docId = await db.insertDocument('/test/embedding.txt', 'Test embedding');
      
      // Create a test embedding
      const embedding = new Float32Array([0.1, 0.2, 0.3]);
      
      // Insert embedding
      await db.insertEmbedding(docId, embedding);
      
      // Verify embedding was inserted
      const result = await db.db.get(
        'SELECT embedding FROM document_embeddings WHERE id = ?',
        [docId]
      );
      
      expect(result).toBeDefined();
      const storedEmbedding = JSON.parse(result.embedding);
      expect(storedEmbedding).toEqual(Array.from(embedding));
    });
  });
  
  describe('similarity search', () => {
    it('should find similar documents', async () => {
      // Insert test documents with embeddings
      const doc1Id = await db.insertDocument('/test/similar1.txt', 'This is about dogs');
      const doc2Id = await db.insertDocument('/test/similar2.txt', 'This is about cats');
      const doc3Id = await db.insertDocument('/test/other.txt', 'This is about programming');
      
      // Insert embeddings (simplified for test)
      await db.insertEmbedding(doc1Id, new Float32Array([0.9, 0.1, 0.1]));
      await db.insertEmbedding(doc2Id, new Float32Array([0.1, 0.9, 0.1]));
      await db.insertEmbedding(doc3Id, new Float32Array([0.1, 0.1, 0.9]));
      
      // Search for documents similar to the first one
      const queryEmbedding = new Float32Array([0.8, 0.15, 0.1]);
      const results = await db.findSimilarDocuments(queryEmbedding, 2);
      
      // Should return the most similar documents
      expect(results.length).toBe(2);
      expect(results[0].id).toBe(doc1Id); // Most similar to query
      expect([doc2Id, doc3Id]).toContain(results[1].id);
    });
  });
  
  describe('full-text search', () => {
    it('should find documents by text search', async () => {
      // Insert test documents
      await db.insertDocument('/test/search1.txt', 'The quick brown fox');
      await db.insertDocument('/test/search2.txt', 'Jumps over the lazy dog');
      await db.insertDocument('/test/search3.txt', 'Programming is fun');
      
      // Search for documents
      const results = await db.searchDocuments('fox OR dog', 10);
      
      // Should find two documents
      expect(results.length).toBe(2);
      expect(results.some(r => r.chunk_text.includes('fox'))).toBe(true);
      expect(results.some(r => r.chunk_text.includes('dog'))).toBe(true);
    });
  });
  
  describe('clear database', () => {
    it('should clear all data', async () => {
      // Insert test data
      await db.insertDocument('/test/clear.txt', 'To be cleared');
      
      // Verify data exists
      let count = await db.db.get('SELECT COUNT(*) as count FROM documents');
      expect(count.count).toBe(1);
      
      // Clear database
      await db.clearDatabase();
      
      // Verify data is gone
      count = await db.db.get('SELECT COUNT(*) as count FROM documents');
      expect(count.count).toBe(0);
    });
  });
});
