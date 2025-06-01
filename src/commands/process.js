import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import { getEmbedding } from '../services/llm.js';
import { chunkText } from '../utils/textChunker.js';

const SUPPORTED_EXTENSIONS = ['.js', '.ts', '.py', '.md', '.txt'];
const IGNORED_DIRS = ['node_modules', '.git', 'dist', 'build', '.DS_Store'];

export async function processFolder(db, folderPath) {
  try {
    console.log(chalk.blue(`\n📂 Processing folder: ${folderPath}`));
    
    // Process all files in the folder
    await processDirectory(folderPath, db);
    
    console.log(chalk.green('\n✅ Folder processing completed!'));
  } catch (error) {
    console.error(chalk.red('❌ Error processing folder:'), error);
    throw error;
  }
}

async function processDirectory(dirPath, db) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    
    if (entry.isDirectory()) {
      if (!IGNORED_DIRS.includes(entry.name)) {
        await processDirectory(fullPath, db);
      }
    } else if (isSupportedFile(entry.name)) {
      await processFile(fullPath, db);
    }
  }
}

function isSupportedFile(filename) {
  const ext = path.extname(filename).toLowerCase();
  return SUPPORTED_EXTENSIONS.includes(ext);
}

async function processFile(filePath, db) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const chunks = chunkText(content, filePath);
    
    console.log(chalk.gray(`  📄 ${filePath} (${chunks.length} chunks)`));
    
    // Store document
    const docId = await db.insertDocument({
      content: content.substring(0, 1000), // Store first 1000 chars as preview
      filePath,
      metadata: JSON.stringify({
        size: content.length,
        chunks: chunks.length,
        lastModified: Date.now()
      })
    });
    
    // Process and store chunks
    for (const [index, chunk] of chunks.entries()) {
      const embedding = await getEmbedding(chunk.text);
      await db.insertEmbedding(
        docId,
        embedding,
        filePath,
        `Chunk ${index + 1}`
      );
    }
    
    return true;
  } catch (error) {
    console.error(chalk.red(`❌ Error processing file ${filePath}:`), error);
    return false;
  }
}
