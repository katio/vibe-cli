import { expect } from 'chai';
import { db } from '../../src/services/database.js';
import { getConfig } from '../../src/config/index.js';
import { fileURLToPath } from 'url';
import path from 'path';
import { unlinkSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEST_DB_PATH = path.join(__dirname, '..', 'test-db.sqlite');

describe('Database Service', () => {
  before(async () => {
    // Set test database path
    process.env.DB_PATH = TEST_DB_PATH;
    
    // Delete test database if it exists
    if (existsSync(TEST_DB_PATH)) {
      unlinkSync(TEST_DB_PATH);
    }
    
    // Initialize database
    await db.initialize();
  });
  
  after(() => {
    // Close database connection
    db.close();
    
    // Clean up test database
    if (existsSync(TEST_DB_PATH)) {
      unlinkSync(TEST_DB_PATH);
    }
  });
  
  describe('initialize()', () => {
    it('should initialize the database with required tables', async () => {
      // Check if tables exist
      const tables = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table'"
      ).all();
      
      const tableNames = tables.map(t => t.name);
      expect(tableNames).to.include('documents');
      expect(tableNames).to.include('vec_documents');
    });
  });
  
  describe('storeDocument()', () => {
    it('should store a document and its embedding', async () => {
      const filePath = '/test/path/document.txt';
      const chunkText = 'This is a test document chunk';
      const embedding = new Array(1536).fill(0.1); // Mock embedding
      
      const docId = await db.storeDocument(filePath, chunkText, embedding);
      
      expect(docId).to.be.a('number');
      expect(docId).to.be.greaterThan(0);
      
      // Verify document was stored
      const doc = db.prepare(
        'SELECT * FROM documents WHERE id = ?'
      ).get(docId);
      
      expect(doc).to.exist;
      expect(doc.file_path).to.equal(filePath);
      expect(doc.chunk_text).to.equal(chunkText);
      
      // Verify embedding was stored
      const vecDoc = db.prepare(
        'SELECT * FROM vec_documents WHERE document_id = ?'
      ).get(docId);
      
      expect(vecDoc).to.exist;
      expect(JSON.parse(vecDoc.embedding)).to.be.an('array').with.lengthOf(1536);
    });
  });
  
  describe('findSimilarDocuments()', () => {
    it('should find similar documents based on embedding', async () => {
      const queryEmbedding = new Array(1536).fill(0.1); // Same as test document
      
      const results = db.findSimilarDocuments(queryEmbedding, 5);
      
      expect(results).to.be.an('array');
      expect(results).to.have.lengthOf(1);
      expect(results[0]).to.have.property('id');
      expect(results[0]).to.have.property('file_path', '/test/path/document.txt');
      expect(results[0]).to.have.property('chunk_text', 'This is a test document chunk');
      expect(results[0]).to.have.property('similarity');
      expect(results[0].similarity).to.be.a('number');
    });
  });
});
