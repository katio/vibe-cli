import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import path from 'path';
import { config } from '../config/config.js';
import { logger } from '../utils/logger.js';
import fs from 'fs';
import * as sqliteVec from 'sqlite-vec';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class VibeDatabase {
  constructor() {
    this.db = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      // Create database directory if it doesn't exist
      const dbDir = path.dirname(path.resolve(config.dbPath));
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      // Open the database
      this.db = new Database(config.dbPath);
      
      // Load sqlite-vec extension
      try {
        sqliteVec.load(this.db);
        logger.debug('Loaded sqlite-vec extension');
      } catch (error) {
        logger.error(`Failed to load sqlite-vec extension: ${error.message}`);
        throw error;
      }
      
      // Enable foreign keys
      this.db.pragma('foreign_keys = ON');
      
      // Enable WAL mode for better concurrency
      this.db.pragma('journal_mode = WAL');
      
      // Enable vector extension
      this.db.pragma('vector_table_name=vector_embeddings');

      // Initialize schema
      await this.initSchema();

      this.initialized = true;
      logger.debug('Database initialized successfully');
    } catch (error) {
      logger.error(`Failed to initialize database: ${error.message}`);
      throw error;
    }
  }

  async initSchema() {
    // Enable WAL mode for better concurrency
    this.db.pragma('journal_mode = WAL');
    
    // Enable foreign keys
    this.db.pragma('foreign_keys = ON');

    // Create documents table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_path TEXT NOT NULL UNIQUE,
        file_name TEXT,
        file_extension TEXT,
        file_size INTEGER,
        last_modified INTEGER,
        chunk_text TEXT NOT NULL,
        chunk_index INTEGER,
        chunk_count INTEGER,
        metadata TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create full-text search virtual table
    this.db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS documents_fts USING fts5(
        file_path,
        file_name,
        chunk_text,
        content=documents,
        content_rowid=id,
        tokenize='porter unicode61 remove_diacritics 2'
      );
    `);

    // Create triggers to keep FTS index in sync
    this.db.exec(`
      CREATE TRIGGER IF NOT EXISTS documents_ai AFTER INSERT ON documents
      BEGIN
        INSERT INTO documents_fts(rowid, file_path, file_name, chunk_text)
        VALUES (new.id, new.file_path, new.file_name, new.chunk_text);
      END;
    `);

    this.db.exec(`
      CREATE TRIGGER IF NOT EXISTS documents_ad AFTER DELETE ON documents
      BEGIN
        INSERT INTO documents_fts(documents_fts, rowid, file_path, file_name, chunk_text)
        VALUES('delete', old.id, old.file_path, old.file_name, old.chunk_text);
      END;
    `);

    this.db.exec(`
      CREATE TRIGGER IF NOT EXISTS documents_au AFTER UPDATE ON documents
      BEGIN
        INSERT INTO documents_fts(documents_fts, rowid, file_path, file_name, chunk_text)
        VALUES('delete', old.id, old.file_path, old.file_name, old.chunk_text);
        
        INSERT INTO documents_fts(rowid, file_path, file_name, chunk_text)
        VALUES (new.id, new.file_path, new.file_name, new.chunk_text);
      END;
    `);

    // Create vector embeddings table using sqlite-vec
    try {
      this.db.exec(`
        CREATE VIRTUAL TABLE IF NOT EXISTS document_embeddings USING vec0(
          document_id INTEGER PRIMARY KEY,
          embedding FLOAT[1536],
          file_path TEXT,
          chunk_text TEXT
        );
      `);
      logger.debug('Created document_embeddings table');
    } catch (error) {
      logger.error(`Failed to create document_embeddings table: ${error.message}`);
      throw error;
    }
  }

  async insertDocument(document) {
    const { filePath, fileName, fileExtension, fileSize, lastModified, chunkText, chunkIndex, chunkCount, metadata } = document;
    
    // Start a transaction
    const transaction = this.db.transaction((doc) => {
      // Insert or replace document
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO documents (
          file_path, file_name, file_extension, file_size, last_modified, 
          chunk_text, chunk_index, chunk_count, metadata, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(file_path) DO UPDATE SET
          file_name = excluded.file_name,
          file_extension = excluded.file_extension,
          file_size = excluded.file_size,
          last_modified = excluded.last_modified,
          chunk_text = excluded.chunk_text,
          chunk_index = excluded.chunk_index,
          chunk_count = excluded.chunk_count,
          metadata = excluded.metadata,
          updated_at = CURRENT_TIMESTAMP
        RETURNING id
      `);
      
      const result = stmt.get(
        doc.filePath, 
        doc.fileName, 
        doc.fileExtension, 
        doc.fileSize, 
        doc.lastModified, 
        doc.chunkText, 
        doc.chunkIndex, 
        doc.chunkCount, 
        JSON.stringify(doc.metadata || {})
      );
      
      return result.id;
    });
    
    return transaction({
      filePath, fileName, fileExtension, fileSize, lastModified, 
      chunkText, chunkIndex, chunkCount, metadata
    });
  }

  async insertEmbedding(documentId, embedding, filePath, chunkText) {
    if (!this.initialized) await this.initialize();

    try {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO document_embeddings 
        (document_id, embedding, file_path, chunk_text)
        VALUES (?, ?, ?, ?)
      `);
      
      // Convert embedding to Float32Array if it's not already
      const embeddingArray = embedding instanceof Float32Array ? 
        embedding : new Float32Array(embedding);
      
      // Convert to Uint8Array for storage
      const buffer = new Uint8Array(embeddingArray.buffer);
      
      stmt.run(documentId, buffer, filePath, chunkText);
      return documentId;
    } catch (error) {
      logger.error(`Error inserting embedding: ${error.message}`);
      throw error;
    }
  }

  async findSimilarDocuments(embedding, limit = 5, threshold = 0.7) {
    if (!this.initialized) await this.initialize();

    try {
      // Convert embedding to the format expected by sqlite-vec
      const embeddingArray = Array.isArray(embedding) ? embedding : Array.from(embedding);
      
      const stmt = this.db.prepare(`
        SELECT d.id, d.file_path, d.chunk_text, de.distance
        FROM document_embeddings de
        JOIN documents d ON d.id = de.document_id
        WHERE de.embedding MATCH ?
          AND de.distance < ?
        ORDER BY de.distance
        LIMIT ?
      `);
      
      // Convert embedding to Float32Array if it's not already
      const embeddingArrayFloat32 = embedding instanceof Float32Array ? 
        embedding : new Float32Array(embedding);
      
      // For sqlite-vec, we need to prepare the query vector
      const queryVector = new Uint8Array(embeddingArrayFloat32.buffer);
      
      return stmt.all(queryVector, threshold, limit);
    } catch (error) {
      logger.error(`Error finding similar documents: ${error.message}`);
      throw error;
    }
  }

  async searchDocuments(query, limit = 10) {
    if (!this.initialized) await this.initialize();

    try {
      const stmt = this.db.prepare(`
        SELECT id, file_path, chunk_text,
               snippet(documents_fts, 1, '', '', '...', 10) as snippet,
               bm25(documents_fts) as rank
        FROM documents_fts
        WHERE documents_fts MATCH ?
        ORDER BY rank
        LIMIT ?
      `);
      
      return stmt.all(query, limit);
    } catch (error) {
      logger.error(`Error searching documents: ${error.message}`);
      throw error;
    }
  }

  async hybridSearch(query, embedding, limit = 5, ftsWeight = 0.5, vectorWeight = 0.5) {
    if (!this.initialized) await this.initialize();

    try {
      // First, get full-text search results
      const ftsResults = await this.searchDocuments(query, limit * 2);
      
      // Then, get vector search results
      const vectorResults = await this.findSimilarDocuments(embedding, limit * 2);
      
      // Combine and rank results
      const resultsMap = new Map();
      
      // Add FTS results with weighted scores
      ftsResults.forEach(doc => {
        const score = (1 - (doc.rank / 100)) * ftsWeight; // Normalize FTS score
        resultsMap.set(doc.id, {
          ...doc,
          fts_score: score,
          vector_score: 0,
          combined_score: score
        });
      });
      
      // Add or update with vector search results
      vectorResults.forEach(doc => {
        const score = (1 - doc.distance) * vectorWeight; // Normalize distance to score
        const existing = resultsMap.get(doc.id) || {
          id: doc.id,
          file_path: doc.file_path,
          chunk_text: doc.chunk_text,
          fts_score: 0,
          vector_score: 0,
          combined_score: 0
        };
        
        resultsMap.set(doc.id, {
          ...existing,
          vector_score: score,
          combined_score: (existing.fts_score || 0) + score
        });
      });
      
      // Sort by combined score and return top results
      return Array.from(resultsMap.values())
        .sort((a, b) => b.combined_score - a.combined_score)
        .slice(0, limit);
    } catch (error) {
      logger.error(`Error in hybrid search: ${error.message}`);
      throw error;
    }
  }

  async clearDatabase() {
    if (!this.initialized) await this.initialize();

    try {
      // Disable foreign keys temporarily
      this.db.pragma('foreign_keys = OFF');
      
      // Clear all tables
      await this.db.exec('DELETE FROM documents');
      await this.db.exec('DELETE FROM documents_fts');
      await this.db.exec('DELETE FROM document_embeddings');
      
      // Rebuild vector index
      await this.db.exec('VACUUM');
      
      // Re-enable foreign keys
      this.db.pragma('foreign_keys = ON');
      
      logger.info('Database cleared and optimized');
      return true;
    } catch (error) {
      // Ensure foreign keys are re-enabled even if there's an error
      this.db.pragma('foreign_keys = ON');
      logger.error(`Error clearing database: ${error.message}`);
      logger.error(`Failed to clear database: ${error.message}`);
      throw error;
    }
  }

  async close() {
    if (this.db) {
      this.db.close();
      this.initialized = false;
      logger.debug('Database connection closed');
    }
  }
}

// Export a singleton instance
export const db = new VibeDatabase();

// Handle process termination
process.on('SIGINT', async () => {
  logger.info('Shutting down database connection...');
  await db.close();
  process.exit(0);
});
