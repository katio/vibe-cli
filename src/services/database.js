import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from '../config/config.js';
import { logger } from '../utils/logger.js';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class Database {
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
      this.db = await open({
        filename: config.dbPath,
        driver: sqlite3.Database,
      });

      // Enable foreign keys
      await this.db.exec('PRAGMA foreign_keys = ON');

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
    try {
      // Enable WAL mode for better concurrency
      await this.db.exec('PRAGMA journal_mode = WAL');

      // Create documents table
      await this.db.exec(`
        CREATE TABLE IF NOT EXISTS documents (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          file_path TEXT NOT NULL,
          chunk_text TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          metadata TEXT,
          UNIQUE(file_path, chunk_text)
        )
      `);

      // Create full-text search virtual table
      await this.db.exec(`
        CREATE VIRTUAL TABLE IF NOT EXISTS documents_fts 
        USING fts5(
          file_path, 
          chunk_text,
          content='documents',
          content_rowid='id'
        )
      `);

      // Create triggers to keep the FTS index in sync
      await this.db.exec(`
        CREATE TRIGGER IF NOT EXISTS documents_ai AFTER INSERT ON documents
        BEGIN
          INSERT INTO documents_fts(rowid, file_path, chunk_text)
          VALUES (new.id, new.file_path, new.chunk_text);
        END;
      `);

      await this.db.exec(`
        CREATE TRIGGER IF NOT EXISTS documents_ad AFTER DELETE ON documents
        BEGIN
          INSERT INTO documents_fts(documents_fts, rowid, file_path, chunk_text)
          VALUES('delete', old.id, old.file_path, old.chunk_text);
        END;
      `);

      await this.db.exec(`
        CREATE TRIGGER IF NOT EXISTS documents_au AFTER UPDATE ON documents
        BEGIN
          INSERT INTO documents_fts(documents_fts, rowid, file_path, chunk_text)
          VALUES('delete', old.id, old.file_path, old.chunk_text);
          
          INSERT INTO documents_fts(rowid, file_path, chunk_text)
          VALUES (new.id, new.file_path, new.chunk_text);
        END;
      `);

      // Create embeddings table if using vector search
      // Note: sqlite-vec extension needs to be loaded separately
      try {
        await this.db.exec(`
          CREATE TABLE IF NOT EXISTS document_embeddings (
            id INTEGER PRIMARY KEY,
            embedding BLOB,
            FOREIGN KEY (id) REFERENCES documents(id) ON DELETE CASCADE
          )
        `);

        // Create index for faster similarity search
        await this.db.exec(`
          CREATE INDEX IF NOT EXISTS idx_document_embeddings_id 
          ON document_embeddings(id)
        `);
      } catch (error) {
        logger.warn('Could not set up vector embeddings. Ensure sqlite-vec extension is loaded.');
        logger.debug(error);
      }

      logger.debug('Database schema initialized');
    } catch (error) {
      logger.error(`Failed to initialize database schema: ${error.message}`);
      throw error;
    }
  }

  async insertDocument(filePath, chunkText, metadata = {}) {
    if (!this.initialized) await this.initialize();

    try {
      const result = await this.db.run(
        `INSERT OR IGNORE INTO documents (file_path, chunk_text, metadata) 
         VALUES (?, ?, ?)`,
        [filePath, chunkText, JSON.stringify(metadata)]
      );

      return result.lastID;
    } catch (error) {
      logger.error(`Error inserting document: ${error.message}`);
      throw error;
    }
  }

  async insertEmbedding(docId, embedding) {
    if (!this.initialized) await this.initialize();

    try {
      await this.db.run(
        `INSERT OR REPLACE INTO document_embeddings (id, embedding) VALUES (?, ?)`,
        [docId, JSON.stringify(Array.from(embedding))]
      );
    } catch (error) {
      logger.error(`Error inserting embedding: ${error.message}`);
      throw error;
    }
  }

  async findSimilarDocuments(embedding, limit = 5) {
    if (!this.initialized) await this.initialize();

    try {
      // For vector similarity search
      const results = await this.db.all(
        `SELECT d.id, d.file_path, d.chunk_text, 
               1 - (embedding <=> ?) as similarity
         FROM documents d
         JOIN document_embeddings de ON d.id = de.id
         ORDER BY similarity DESC
         LIMIT ?`,
        [JSON.stringify(Array.from(embedding)), limit]
      );

      return results;
    } catch (error) {
      logger.error(`Error finding similar documents: ${error.message}`);
      throw error;
    }
  }

  async searchDocuments(query, limit = 5) {
    if (!this.initialized) await this.initialize();

    try {
      // For full-text search
      const results = await this.db.all(
        `SELECT id, file_path, chunk_text,
                bm25(documents_fts) as rank
         FROM documents_fts
         WHERE documents_fts MATCH ?
         ORDER BY rank
         LIMIT ?`,
        [`${query}*`,
         limit]
      );

      return results;
    } catch (error) {
      logger.error(`Error searching documents: ${error.message}`);
      throw error;
    }
  }

  async clearDatabase() {
    if (!this.initialized) await this.initialize();

    try {
      await this.db.exec('BEGIN');
      await this.db.exec('DELETE FROM documents');
      await this.db.exec('DELETE FROM document_embeddings');
      await this.db.exec('VACUUM');
      await this.db.exec('COMMIT');
      
      logger.info('Database cleared successfully');
    } catch (error) {
      await this.db.exec('ROLLBACK');
      logger.error(`Error clearing database: ${error.message}`);
      throw error;
    }
  }

  async close() {
    if (this.db) {
      await this.db.close();
      this.initialized = false;
    }
  }
}

// Export a singleton instance
export const db = new Database();

// Handle process termination
process.on('SIGINT', async () => {
  logger.info('Shutting down database connection...');
  await db.close();
  process.exit(0);
});
