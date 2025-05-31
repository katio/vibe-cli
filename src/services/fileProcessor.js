import fs from 'fs/promises';
import path from 'path';
import { promisify } from 'util';
import { glob } from 'glob';
import { config } from '../config/config.js';
import { logger } from '../utils/logger.js';
import { db } from './database.js';

// This will be set by the initialize function
let llmService;

const globPromise = promisify(glob);

export class FileProcessor {
  static initialize(service) {
    llmService = service;
  }

  constructor() {
    if (!llmService) {
      throw new Error('FileProcessor must be initialized with an LLM service');
    }
    this.db = db;
    this.processedFiles = new Set();
  }

  /**
   * Process a directory recursively and load its contents
   * @param {string} dirPath - Path to the directory to process
   */
  async processDirectory(dirPath) {
    try {
      const spinner = logger.spin(`Processing directory: ${dirPath}`);
      
      // Resolve to absolute path
      const absolutePath = path.resolve(dirPath);
      
      // Check if directory exists
      try {
        await fs.access(absolutePath);
      } catch (error) {
        spinner.fail(`Directory does not exist: ${absolutePath}`);
        throw new Error(`Directory does not exist: ${absolutePath}`);
      }

      // Get all files matching the allowed extensions
      const patterns = [
        ...config.fileExtensions.text.map(ext => `**/*${ext}`),
        ...config.fileExtensions.code.map(ext => `**/*${ext}`),
      ];

      const files = await globPromise(patterns, {
        cwd: absolutePath,
        ignore: config.ignoredDirs.map(dir => `**/${dir}/**`),
        nodir: true,
        absolute: true,
      });

      if (files.length === 0) {
        spinner.warn('No matching files found in the specified directory');
        return;
      }

      logger.info(`Found ${files.length} files to process`);

      // Process each file
      let processedCount = 0;
      let chunkCount = 0;

      for (const filePath of files) {
        try {
          const relativePath = path.relative(absolutePath, filePath);
          spinner.text = `Processing (${processedCount + 1}/${files.length}): ${relativePath}`;
          
          const chunks = await this.processFile(filePath);
          chunkCount += chunks.length;
          processedCount++;
        } catch (error) {
          logger.error(`Error processing file ${filePath}: ${error.message}`);
        }
      }

      spinner.succeed(`Processed ${processedCount} files (${chunkCount} chunks)`);
    } catch (error) {
      logger.error(`Error processing directory: ${error.message}`);
      throw error;
    }
  }

  /**
   * Process a single file and store its chunks
   * @param {string} filePath - Path to the file
   * @returns {Promise<Array<{text: string, metadata: Object}>>} - The processed chunks
   */
  async processFile(filePath, spinner) {
    try {
      const stats = await fs.stat(filePath);
      
      // Skip files that are too large
      if (stats.size > config.maxFileSize) {
        logger.warn(`Skipping large file: ${filePath} (${stats.size} bytes)`);
        this.processedFiles.add(filePath);
        return;
      }

      // Check if file has been modified since last processed
      const existingDoc = await this.getDocumentByPath(filePath);
      if (existingDoc && existingDoc.last_modified >= Math.floor(stats.mtimeMs / 1000)) {
        logger.debug(`Skipping unchanged file: ${filePath}`);
        this.processedFiles.add(filePath);
        return;
      }

      // Read file content
      const content = await fs.readFile(filePath, 'utf-8');
      
      // Process file content (chunking, etc.)
      const chunks = this.chunkContent(content, filePath);
      
      // Process each chunk
      for (const [index, chunk] of chunks.entries()) {
        try {
          // Store document chunk in database
          const docId = await db.insertDocument({
            filePath,
            fileName: path.basename(filePath),
            fileExtension: path.extname(filePath),
            fileSize: stats.size,
            lastModified: Math.floor(stats.mtimeMs / 1000),
            chunkText: chunk,
            chunkIndex: index,
            chunkCount: chunks.length,
            metadata: {
              path: filePath,
              extension: path.extname(filePath),
              size: stats.size,
              lastModified: stats.mtime.toISOString(),
              chunks: chunks.length
            }
          });

          // Generate embedding for the chunk
          if (this.llmService) {
            try {
              const embedding = await this.llmService.generateEmbedding(chunk);
              await db.insertEmbedding(docId, embedding, filePath, chunk);
              logger.debug(`Processed chunk ${index + 1}/${chunks.length} of ${filePath}`);
            } catch (error) {
              logger.error(`Failed to generate embedding for ${filePath} chunk ${index + 1}:`, error);
            }
          } else {
            logger.warn('LLM service not available, skipping embedding generation');
          }
        } catch (error) {
          logger.error(`Error processing chunk ${index + 1} of ${filePath}:`, error);
        }
      }
      
      this.processedFiles.add(filePath);
      logger.debug(`Processed file: ${filePath} (${chunks.length} chunks)`);
    } catch (error) {
      logger.error(`Error processing file ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Get a document by its file path
   * @param {string} filePath - Path to the file
   * @returns {Promise<Object|null>} The document or null if not found
   */
  async getDocumentByPath(filePath) {
    try {
      const stmt = db.prepare('SELECT * FROM documents WHERE file_path = ?');
      return stmt.get(filePath);
    } catch (error) {
      logger.error(`Error getting document by path ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Chunk text content into smaller pieces
   * @param {string} content - The text to chunk
   * @param {string} filePath - The file path
   * @returns {Array<string>} - The chunks
   */
  chunkContent(content, filePath) {
    const extension = path.extname(filePath).toLowerCase();
    const isCode = config.fileExtensions.code.includes(extension);
    const chunkSize = isCode ? config.chunking.codeChunkSize : config.chunking.textChunkSize;
    const chunkOverlap = isCode ? config.chunking.codeChunkOverlap : config.chunking.textChunkOverlap;

    // Simple chunking implementation - can be enhanced with more sophisticated strategies
    const chunks = [];
    let start = 0;
    
    while (start < content.length) {
      let end = start + chunkSize;
      
      // Try to find a good breaking point (newline for text, semicolon/brace for code)
      if (end < content.length) {
        if (isCode) {
          // For code, try to break at a semicolon, brace, or newline
          const nextBreak = Math.min(
            content.indexOf(';', start + chunkSize - 50) + 1 || Infinity,
            content.indexOf('}', start + chunkSize - 50) + 1 || Infinity,
            content.indexOf('\n', start + chunkSize - 20) + 1 || Infinity,
            start + chunkSize
          );
          end = Math.min(nextBreak, start + chunkSize * 1.5); // Don't let it get too big
        } else {
          // For text, try to break at a paragraph or sentence
          const nextPara = content.indexOf('\n\n', start + chunkSize - 50) + 2 || Infinity;
          const nextSentence = content.indexOf('. ', start + chunkSize - 50) + 2 || Infinity;
          end = Math.min(nextPara, nextSentence, start + chunkSize * 1.2);
        }
      }
      
      // If we couldn't find a good break, just take the chunk as is
      if (end <= start) end = start + chunkSize;
      
      // Add the chunk
      const chunk = content.slice(start, end).trim();
      if (chunk.length > 0) {
        chunks.push(chunk);
      }
      
      // Move the start position, with overlap
      start = end - Math.min(chunkOverlap, end - start);
      
      // If we're not making progress, force a step to avoid infinite loop
      if (start === end) start += 1;
    }
    
    return chunks;
  }
}

// Export a singleton instance
export const fileProcessor = new FileProcessor({ db, llmService });
