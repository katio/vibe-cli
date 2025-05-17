import fs from 'fs/promises';
import path from 'path';
import { promisify } from 'util';
import { glob } from 'glob';
import { config } from '../config/config.js';
import { logger } from '../utils/logger.js';

const globPromise = promisify(glob);

export class FileProcessor {
  constructor({ db, llmService }) {
    this.db = db;
    this.llmService = llmService;
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
  async processFile(filePath) {
    try {
      // Skip if already processed
      if (this.processedFiles.has(filePath)) {
        return [];
      }

      // Read file content
      const content = await fs.readFile(filePath, 'utf-8');
      if (!content.trim()) {
        return [];
      }

      // Get file extension
      const ext = path.extname(filePath).toLowerCase();
      
      // Chunk the content based on file type
      let chunks = [];
      
      if (config.fileExtensions.text.includes(ext)) {
        chunks = this.chunkText(content);
      } else if (config.fileExtensions.code.includes(ext)) {
        chunks = this.chunkCode(content);
      } else {
        // Default chunking strategy
        chunks = this.chunkText(content);
      }

      // Store chunks in the database
      for (const chunk of chunks) {
        try {
          const chunkText = typeof chunk === 'string' ? chunk : chunk.text;
          const metadata = {
            filePath,
            extension: ext,
            ...(typeof chunk === 'object' ? chunk.metadata : {}),
          };

          const docId = await this.db.insertDocument(filePath, chunkText, metadata);
          
          // Generate and store embeddings if this is a new document
          if (docId) {
            try {
              const embedding = await this.llmService.getEmbedding(chunkText);
              await this.db.insertEmbedding(docId, embedding);
            } catch (error) {
              logger.warn(`Failed to generate embedding for document ${docId}: ${error.message}`);
            }
          }
        } catch (error) {
          logger.error(`Error storing chunk: ${error.message}`);
        }
      }

      this.processedFiles.add(filePath);
      return chunks;
    } catch (error) {
      logger.error(`Error processing file ${filePath}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Chunk text content into smaller pieces
   * @param {string} text - The text to chunk
   * @returns {Array<{text: string, metadata: Object}>} - The chunks with metadata
   */
  chunkText(text) {
    const { maxChunkSize, overlap, minChunkSize } = config.chunking.text;
    const chunks = [];
    
    // First, try to split by paragraphs (double newline)
    const paragraphs = text.split(/\n\s*\n/);
    
    for (const paragraph of paragraphs) {
      // If paragraph is small enough, add as is
      if (paragraph.length <= maxChunkSize) {
        if (paragraph.trim().length >= minChunkSize) {
          chunks.push({
            text: paragraph.trim(),
            metadata: { chunkType: 'paragraph' }
          });
        }
        continue;
      }
      
      // Otherwise, try to split by sentences
      const sentences = this.splitIntoSentences(paragraph);
      let currentChunk = [];
      let currentLength = 0;
      
      for (const sentence of sentences) {
        const sentenceLength = sentence.length;
        
        // If adding this sentence would exceed maxChunkSize, finalize current chunk
        if (currentLength + sentenceLength > maxChunkSize && currentChunk.length > 0) {
          chunks.push({
            text: currentChunk.join(' ').trim(),
            metadata: { chunkType: 'sentence_group' }
          });
          
          // Start new chunk with overlap
          const overlapStart = Math.max(0, currentChunk.length - Math.ceil(overlap / 20)); // Approximate overlap in sentences
          currentChunk = currentChunk.slice(overlapStart);
          currentLength = currentChunk.reduce((sum, s) => sum + s.length + 1, 0);
        }
        
        currentChunk.push(sentence);
        currentLength += sentenceLength + 1; // +1 for space
      }
      
      // Add the last chunk if not empty
      if (currentChunk.length > 0) {
        chunks.push({
          text: currentChunk.join(' ').trim(),
          metadata: { chunkType: 'sentence_group' }
        });
      }
    }
    
    // If we still have very large chunks, split by fixed size
    const finalChunks = [];
    for (const chunk of chunks) {
      if (chunk.text.length <= maxChunkSize) {
        finalChunks.push(chunk);
      } else {
        // Split into fixed-size chunks with overlap
        const fixedChunks = this.splitByFixedSize(chunk.text, maxChunkSize, overlap);
        finalChunks.push(...fixedChunks.map(text => ({
          text,
          metadata: { ...chunk.metadata, chunkType: 'fixed_size' }
        })));
      }
    }
    
    return finalChunks;
  }

  /**
   * Chunk code content into smaller pieces
   * @param {string} code - The code to chunk
   * @returns {Array<{text: string, metadata: Object}>} - The chunks with metadata
   */
  chunkCode(code) {
    const { maxLines, maxChunkSize } = config.chunking.code;
    const lines = code.split('\n');
    const chunks = [];
    
    // First, try to split by functions/classes if the language supports it
    // This is a simplified version - in a real implementation, you'd want to use a proper parser
    const functionRegex = /(?:function|class|def|fn)\s+([a-zA-Z0-9_]+)\s*[({]/g;
    let lastIndex = 0;
    let match;
    
    while ((match = functionRegex.exec(code)) !== null) {
      const startPos = match.index;
      const name = match[1];
      
      if (startPos > lastIndex) {
        // Add the code before this function
        const beforeCode = code.substring(lastIndex, startPos).trim();
        if (beforeCode) {
          chunks.push({
            text: beforeCode,
            metadata: { chunkType: 'code_block' }
          });
        }
      }
      
      // Find the end of the function/class (simplified)
      let braceCount = 0;
      let inString = false;
      let stringChar = '';
      let endPos = startPos;
      
      for (let i = startPos; i < code.length; i++) {
        const char = code[i];
        
        if (!inString && (char === '"' || char === "'" || char === '`')) {
          inString = true;
          stringChar = char;
        } else if (inString && char === stringChar && code[i-1] !== '\\') {
          inString = false;
        }
        
        if (!inString) {
          if (char === '{' || char === '(') {
            braceCount++;
          } else if (char === '}' || char === ')') {
            braceCount--;
            if (braceCount === 0) {
              endPos = i + 1;
              break;
            }
          }
        }
      }
      
      // Add the function/class
      const functionCode = code.substring(startPos, endPos).trim();
      if (functionCode) {
        chunks.push({
          text: functionCode,
          metadata: { chunkType: 'function', name }
        });
      }
      
      lastIndex = endPos;
      functionRegex.lastIndex = endPos;
    }
    
    // Add any remaining code
    if (lastIndex < code.length) {
      const remainingCode = code.substring(lastIndex).trim();
      if (remainingCode) {
        chunks.push({
          text: remainingCode,
          metadata: { chunkType: 'code_block' }
        });
      }
    }
    
    // If no functions were found, split by lines
    if (chunks.length === 0) {
      for (let i = 0; i < lines.length; i += maxLines) {
        const chunkLines = lines.slice(i, i + maxLines);
        const chunkText = chunkLines.join('\n').trim();
        
        if (chunkText) {
          chunks.push({
            text: chunkText,
            metadata: { chunkType: 'code_lines', startLine: i + 1, endLine: i + chunkLines.length }
          });
        }
      }
    }
    
    // If any chunks are still too large, split by fixed size
    const finalChunks = [];
    for (const chunk of chunks) {
      if (chunk.text.length <= maxChunkSize) {
        finalChunks.push(chunk);
      } else {
        const fixedChunks = this.splitByFixedSize(chunk.text, maxChunkSize, 100);
        finalChunks.push(...fixedChunks.map(text => ({
          text,
          metadata: { ...chunk.metadata, chunkType: 'fixed_size' }
        })));
      }
    }
    
    return finalChunks;
  }

  /**
   * Split text into sentences using a simple regex
   * @private
   */
  splitIntoSentences(text) {
    // This is a simple sentence splitter - for production use, consider a more robust solution
    return text.match(/[^.!?]+[.!?]+\s*/g) || [text];
  }

  /**
   * Split text into chunks of fixed size with overlap
   * @private
   */
  splitByFixedSize(text, chunkSize, overlap) {
    const chunks = [];
    let start = 0;
    
    while (start < text.length) {
      let end = start + chunkSize;
      
      // Try to find a good breaking point (space or newline)
      if (end < text.length) {
        // Look for the last space or newline in the chunk
        let lastSpace = text.lastIndexOf(' ', end);
        let lastNewline = text.lastIndexOf('\n', end);
        
        // Prefer newline over space if found
        if (lastNewline > start + (chunkSize * 0.8)) {
          end = lastNewline + 1;
        } else if (lastSpace > start + (chunkSize * 0.8)) {
          end = lastSpace + 1;
        }
      }
      
      chunks.push(text.substring(start, end).trim());
      
      // Move start position, considering overlap
      start = Math.max(start + 1, end - overlap);
    }
    
    return chunks;
  }
}

// Export a singleton instance
export const fileProcessor = new FileProcessor({ db, llmService });
