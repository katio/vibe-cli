import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import path from 'path';
import { getConfig } from '../config/index.js';
import fs from 'fs';
import * as sqliteVec from 'sqlite-vec';
import { getEmbedding } from './llm/providers.js';
import chalk from 'chalk';

// Helper function to add a small delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class VibeDatabase {
  constructor() {
    this.db = null;
    this.initialized = false;
    this.config = getConfig();
    this.dbPath = path.join(process.cwd(), 'vibe-db.sqlite');
  }

  /**
   * Initialize the database connection and set up schema
   */
  async initialize() {
    if (this.initialized) return;

    try {
      // Create database directory if it doesn't exist
      const dbDir = path.dirname(path.resolve(this.dbPath));
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      // Open the database
      this.db = new Database(this.dbPath);
      
      // Load sqlite-vec extension
      try {
        sqliteVec.load(this.db);
        console.log('✓ Loaded sqlite-vec extension');
      } catch (error) {
        console.error('Failed to load sqlite-vec extension:', error.message);
        throw error;
      }
      
      // Enable WAL mode for better concurrency
      this.db.pragma('journal_mode = WAL');
      this.db.pragma('synchronous = NORMAL');
      this.db.pragma('temp_store = MEMORY');
      
      // Initialize schema
      await this.initSchema();
      this.initialized = true;
    } catch (error) {
      console.error('Database initialization failed:', error);
      throw error;
    }
  }

  /**
   * Initialize database schema
   */
  async initSchema() {
    try {
      // Enable WAL mode first for better concurrency
      console.log('Setting up database with WAL mode...');
      this.db.pragma('journal_mode = WAL');
      await delay(100);
      
      this.db.pragma('synchronous = NORMAL');
      await delay(100);
      
      // Create documents table first
      console.log('Creating documents table...');
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS documents (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          file_path TEXT NOT NULL,
          chunk_text TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await delay(100);

      // Get embedding dimension from config
      const embeddingDimension = this.getEmbeddingDimension();
      
      // Drop existing tables if they exist
      console.log('Dropping existing vector table if it exists...');
      this.db.exec('DROP TABLE IF EXISTS vec_documents;');
      await delay(200); // Give it more time to drop the table
      
      // Create the vector table using vec0 module
      // Note: We can't create indexes on virtual tables
      console.log('Creating vector table...');
      this.db.exec(`
        CREATE VIRTUAL TABLE vec_documents USING vec0(
          embedding float[${embeddingDimension}],
          document_id float
        );
      `);
      await delay(200);
      
      // Create a regular table to store document metadata for faster lookups
      console.log('Creating document metadata table...');
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS document_metadata (
          id FLOAT PRIMARY KEY,
          file_path TEXT NOT NULL,
          chunk_text TEXT NOT NULL
        );
      `);
      await delay(100);
      
      // Create an index on the regular table for document lookups
      console.log('Creating index on document metadata...');
      this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_document_metadata_id 
        ON document_metadata(id);
      `);
      await delay(100);
      
      console.log('Database schema initialized successfully');
      
    } catch (error) {
      console.error('Error initializing database schema:', error);
      // Ensure we close the database connection on error
      try {
        this.db.close();
      } catch (closeError) {
        console.error('Error closing database:', closeError);
      }
      throw error;
    }
  }

  /**
   * Get the embedding dimension based on the active provider
   */
  getEmbeddingDimension() {
    const provider = this.config.activeProvider;
    return this.config.llmModels[provider]?.embeddingDimension || 1536;
  }

  /**
   * Store document chunks and their embeddings
   * @param {Array} chunks - Array of {filePath, text, embedding} objects
   */
  async storeDocumentChunks(chunks) {
    // Prepare statements for document and vector insertion
    const insertDoc = this.db.prepare(
      'INSERT INTO documents (file_path, chunk_text) VALUES (?, ?)'
    );
    
    const insertVec = this.db.prepare(
      'INSERT INTO vec_documents (embedding, document_id) VALUES (?, ?)'
    );
    
    const insertMeta = this.db.prepare(
      'INSERT INTO document_metadata (id, file_path, chunk_text) VALUES (?, ?, ?)'
    );

    // Process chunks in a transaction
    const transaction = this.db.transaction((chunks) => {
      for (const [index, chunk] of chunks.entries()) {
        try {
          // 1. Insert document and get the ID
          const result = insertDoc.run(chunk.filePath, chunk.text);
          
          // 2. Get the document ID as a float
          let docId;
          if (result && result.lastInsertRowid !== undefined) {
            const rowid = result.lastInsertRowid;
            // Convert to float
            if (typeof rowid === 'bigint') {
              docId = Number(rowid);
            } else if (typeof rowid === 'number') {
              docId = rowid; // Keep as float
            } else if (typeof rowid === 'string') {
              docId = parseFloat(rowid);
            }
          }
          
          // Validate document ID
          if (!docId || isNaN(docId) || docId <= 0) {
            console.error(`Invalid document ID for chunk ${index} in ${chunk.filePath}`);
            continue;
          }
          
          // 3. Validate and prepare embedding
          if (!Array.isArray(chunk.embedding) || !chunk.embedding.every(n => typeof n === 'number')) {
            console.error(`Invalid embedding format for chunk ${index} in ${chunk.filePath}`);
            continue;
          }
          
          // 4. Insert the vector (convert embedding to JSON string)
          const embeddingJson = JSON.stringify(chunk.embedding);
          insertVec.run(embeddingJson, docId);
          
          // 5. Store metadata in the separate table
          insertMeta.run(docId, chunk.filePath, chunk.text);
          
        } catch (error) {
          console.error(`Error processing chunk ${index} in ${chunk.filePath}:`, error.message);
          continue;
        }
      }
    });

    // Execute the transaction
    try {
      transaction(chunks);
      return { success: true, processed: chunks.length };
    } catch (error) {
      console.error('Transaction failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Find similar documents using vector search
   * @param {string} query - The search query
   * @param {number} limit - Maximum number of results to return
   * @returns {Promise<Array>} Array of matching documents with similarity scores
   */
  async searchDocuments(query, limit = 5) {
    try {
      // Get embedding for the query
      const embedding = await getEmbedding(query);
      
      // Search for similar documents
      const results = this.db.prepare(`
        SELECT d.id, d.file_path, d.chunk_text,
               v.embedding <=> ? AS similarity
        FROM documents d
        JOIN vec_documents v ON d.id = v.document_id
        ORDER BY similarity
        LIMIT ?
      `).all(JSON.stringify(embedding), limit);
      
      return results;
    } catch (error) {
      console.error(chalk.red('Error searching documents:'), error);
      throw error;
    }
  }
  
  /**
   * Get document by ID
   * @param {number} id - Document ID
   * @returns {Object} Document data
   */
  getDocumentById(id) {
    return this.db.prepare(`
      SELECT id, file_path, chunk_text
      FROM documents
      WHERE id = ?
    `).get(id);
  }
  
  /**
   * Find documents similar to the given embedding
   * @param {Array<number>} embedding - The embedding vector to compare against
   * @param {number} limit - Maximum number of results to return
   * @returns {Array} Array of similar documents with similarity scores
   */
  findSimilarDocuments(embedding, limit = 5) {
    try {
      // Ensure embedding is a valid array of numbers
      if (!Array.isArray(embedding) || !embedding.every(n => typeof n === 'number')) {
        throw new Error('Invalid embedding format');
      }
      
      // Create a temporary table for the query vector
      this.db.exec('DROP TABLE IF EXISTS temp_query_vector');
      this.db.exec('CREATE TEMP TABLE temp_query_vector (v BLOB)');
      
      // Insert the query vector as a JSON string
      const stmt = this.db.prepare('INSERT INTO temp_query_vector (v) VALUES (?)');
      stmt.run(JSON.stringify(embedding));
      
      // Perform the similarity search with k parameter in the query
      const results = this.db.prepare(`
        SELECT 
          m.id, 
          m.file_path, 
          m.chunk_text,
          v.embedding
        FROM document_metadata m
        JOIN (
          SELECT document_id, embedding
          FROM vec_documents
          WHERE embedding MATCH (SELECT v FROM temp_query_vector) AND k = ?
        ) v ON m.id = v.document_id
      `).all(limit);
      
      // Clean up
      this.db.exec('DROP TABLE IF EXISTS temp_query_vector');
      
      return results;
      
    } catch (error) {
      console.error('Error finding similar documents:', error);
      // Clean up in case of error
      this.db.exec('DROP TABLE IF EXISTS temp_query_vector');
      throw error;
    }
  }

  /**
   * Get all documents
   * @returns {Array} Array of all documents
   */
  getAllDocuments() {
    return this.db.prepare(`
      SELECT id, file_path, chunk_text, created_at
      FROM documents
      ORDER BY created_at DESC
    `).all();
  }
  
  /**
   * Delete all documents (for reset)
   */
  async reset() {
    try {
      await this.db.exec('DELETE FROM documents');
      await this.db.exec('DELETE FROM vec_documents');
      return { success: true };
    } catch (error) {
      console.error(chalk.red('Error resetting database:'), error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Close the database connection
   */
  close() {
    if (this.db) {
      this.db.close();
      this.initialized = false;
    }
  }
}

// Export a singleton instance
export const db = new VibeDatabase();

// Export individual functions for easier testing
export const searchDocuments = async (query, limit = 5) => {
  await db.initialize();
  return db.searchDocuments(query, limit);
};

export const findSimilarDocuments = async (embedding, limit = 5) => {
  await db.initialize();
  return db.findSimilarDocuments(embedding, limit);
};

export const getDocumentById = (id) => {
  return db.getDocumentById(id);
};

export const getAllDocuments = () => {
  return db.getAllDocuments();
};

export const resetDatabase = async () => {
  await db.initialize();
  return db.reset();
};

// Handle process termination
process.on('SIGINT', () => {
  db.close();
  process.exit(0);
});

// For backward compatibility
export default db;
