import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import path from 'path';
import { getConfig } from '../config/index.js';
import fs from 'fs';
import * as sqliteVec from 'sqlite-vec';

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
    // Create documents table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_path TEXT NOT NULL,
        chunk_text TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create vector embeddings virtual table
    const embeddingDimension = this.getEmbeddingDimension();
    this.db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS vec_documents 
      USING vec0(
        embedding FLOAT[${embeddingDimension}],
        document_id INTEGER
      );
    `);
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
    const insertDoc = this.db.prepare(
      'INSERT INTO documents (file_path, chunk_text) VALUES (?, ?)'
    );
    
    const insertVec = this.db.prepare(
      'INSERT INTO vec_documents (embedding, document_id) VALUES (?, ?)'
    );

    const transaction = this.db.transaction((chunks) => {
      for (const chunk of chunks) {
        const { lastInsertRowid } = insertDoc.run(chunk.filePath, chunk.text);
        insertVec.run(JSON.stringify(chunk.embedding), lastInsertRowid);
      }
    });

    transaction(chunks);
  }

  /**
   * Find similar documents using vector search
   * @param {number[]} queryEmbedding - The query embedding vector
   * @param {number} limit - Maximum number of results to return
   * @returns {Array} Array of matching documents with similarity scores
   */
  findSimilarDocuments(queryEmbedding, limit = 5) {
    return this.db.prepare(`
      SELECT d.id, d.file_path, d.chunk_text,
             v.embedding <=> ? AS similarity
      FROM documents d
      JOIN vec_documents v ON d.id = v.document_id
      ORDER BY similarity
      LIMIT ?
    `).all(JSON.stringify(queryEmbedding), limit);
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

// Handle process termination
process.on('SIGINT', () => {
  db.close();
  process.exit(0);
});
