import fs from 'fs/promises';
import path from 'path';
import { getEmbedding } from './llm.js';
import { db } from './database.js';
import { getConfig } from '../config/index.js';

const config = getConfig();

// File extensions to process
const TEXT_EXTENSIONS = new Set(['.md', '.txt', '.markdown']);
const CODE_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.c', '.cpp', '.h', '.hpp', '.go', '.rb', '.php']);

// Ignored directories
const IGNORED_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '__pycache__']);

/**
 * Process a directory and its subdirectories to find relevant files
 * @param {string} dirPath - Path to the directory to process
 * @returns {Promise<Array>} Array of file paths
 */
async function findRelevantFiles(dirPath) {
  const files = [];
  
  async function scanDirectory(currentPath) {
    const entries = await fs.readdir(currentPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);
      
      if (entry.isDirectory()) {
        if (!IGNORED_DIRS.has(entry.name) && !entry.name.startsWith('.')) {
          await scanDirectory(fullPath);
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (TEXT_EXTENSIONS.has(ext) || CODE_EXTENSIONS.has(ext)) {
          files.push(fullPath);
        }
      }
    }
  }
  
  await scanDirectory(dirPath);
  return files;
}

/**
 * Split text into chunks using paragraph and sentence boundaries
 * @param {string} text - The text to split
 * @param {number} chunkSize - Maximum chunk size in characters
 * @param {number} chunkOverlap - Overlap between chunks in characters
 * @returns {Array<string>} Array of text chunks
 */
function splitTextIntoSentences(text, chunkSize = 1000, chunkOverlap = 100) {
  if (!text || !text.trim()) return [];
  
  // First try to split by paragraphs (double newline)
  const paragraphs = text.split(/\n\s*\n/);
  const chunks = [];
  
  for (const paragraph of paragraphs) {
    if (paragraph.length <= chunkSize) {
      chunks.push(paragraph.trim());
    } else {
      // If paragraph is too large, split by sentences
      const sentences = paragraph.match(/[^.!?]+[.!?]+/g) || [paragraph];
      let currentChunk = '';
      
      for (const sentence of sentences) {
        if (currentChunk.length + sentence.length > chunkSize) {
          if (currentChunk) {
            chunks.push(currentChunk.trim());
            currentChunk = currentChunk.slice(-chunkOverlap) + ' ' + sentence;
          } else {
            chunks.push(sentence.trim());
          }
        } else {
          currentChunk += (currentChunk ? ' ' : '') + sentence;
        }
      }
      
      if (currentChunk) {
        chunks.push(currentChunk.trim());
      }
    }
  }
  
  return chunks;
}

/**
 * Split code into chunks by lines
 * @param {string} code - The code to split
 * @param {number} maxLines - Maximum number of lines per chunk
 * @param {number} overlapLines - Number of lines to overlap between chunks
 * @returns {Array<string>} Array of code chunks
 */
function splitCodeIntoChunks(code, maxLines = 50, overlapLines = 5) {
  if (!code || !code.trim()) return [];
  
  const lines = code.split('\n');
  const chunks = [];
  
  for (let i = 0; i < lines.length; i += (maxLines - overlapLines)) {
    const chunk = lines.slice(i, i + maxLines).join('\n');
    chunks.push(chunk);
    
    if (i + maxLines >= lines.length) break;
  }
  
  return chunks;
}

/**
 * Process a single file and return its chunks
 * @param {string} filePath - Path to the file
 * @returns {Promise<Array>} Array of chunks with metadata
 */
async function processFile(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const ext = path.extname(filePath).toLowerCase();
    
    let chunks = [];
    
    if (TEXT_EXTENSIONS.has(ext)) {
      chunks = splitTextIntoSentences(
        content, 
        config.chunkSize || 1000, 
        config.chunkOverlap || 100
      );
    } else if (CODE_EXTENSIONS.has(ext)) {
      chunks = splitCodeIntoChunks(
        content,
        config.chunkSize ? Math.floor(config.chunkSize / 30) : 50, // Estimate lines
        config.chunkOverlap ? Math.floor(config.chunkOverlap / 30) : 5
      );
    }
    
    return chunks.map(chunk => ({
      filePath,
      text: chunk,
      metadata: {
        extension: ext,
        timestamp: new Date().toISOString()
      }
    }));
  } catch (error) {
    console.error(`Error processing file ${filePath}:`, error.message);
    return [];
  }
}

/**
 * Process a directory and store embeddings for its content
 * @param {string} dirPath - Path to the directory
 * @param {Function} progressCallback - Callback for progress updates
 */
export async function processDirectory(dirPath, progressCallback = () => {}) {
  try {
    // Initialize database if not already done
    await db.initialize();
    
    // Find all relevant files
    const files = await findRelevantFiles(dirPath);
    console.log(`Found ${files.length} files to process`);
    
    let processedFiles = 0;
    
    for (const file of files) {
      try {
        processedFiles++;
        progressCallback(processedFiles, files.length, file);
        
        // Process file and get chunks
        const chunks = await processFile(file);
        
        // Generate embeddings for each chunk
        const chunksWithEmbeddings = [];
        
        for (const chunk of chunks) {
          try {
            const embedding = await getEmbedding(chunk.text);
            chunksWithEmbeddings.push({
              filePath: chunk.filePath,
              text: chunk.text,
              embedding
            });
          } catch (error) {
            console.error(`Error generating embedding for chunk in ${file}:`, error.message);
          }
        }
        
        // Store chunks and embeddings in database
        if (chunksWithEmbeddings.length > 0) {
          await db.storeDocumentChunks(chunksWithEmbeddings);
        }
        
      } catch (error) {
        console.error(`Error processing ${file}:`, error.message);
      }
    }
    
    console.log(`\nProcessed ${processedFiles} files`);
    return { success: true, processedFiles };
    
  } catch (error) {
    console.error('Error processing directory:', error);
    return { success: false, error: error.message };
  }
}

export default {
  processDirectory,
  findRelevantFiles,
  processFile
};
