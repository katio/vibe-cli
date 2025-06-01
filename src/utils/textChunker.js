import { getConfig } from '../config/index.js';

const { chunkSize = 1000, chunkOverlap = 100 } = getConfig();

export function chunkText(text, filePath) {
  const ext = filePath ? filePath.split('.').pop().toLowerCase() : '';
  
  // Try different chunking strategies based on file type
  if (['md', 'txt'].includes(ext)) {
    return chunkMarkdownText(text);
  } else {
    return chunkCodeText(text);
  }
}

function chunkMarkdownText(text) {
  const chunks = [];
  
  // First try splitting by double newlines (paragraphs)
  const paragraphs = text.split(/\n\s*\n/);
  
  for (const para of paragraphs) {
    if (para.length <= chunkSize) {
      chunks.push({ text: para });
    } else {
      // If paragraph is too long, split by sentences
      const sentences = para.split(/(?<=[.!?])\s+/);
      let currentChunk = [];
      let currentLength = 0;
      
      for (const sentence of sentences) {
        if (currentLength + sentence.length > chunkSize && currentChunk.length > 0) {
          chunks.push({ text: currentChunk.join(' ') });
          currentChunk = currentChunk.slice(-Math.floor(chunkOverlap / 20)); // Keep some overlap
          currentLength = currentChunk.join(' ').length;
        }
        currentChunk.push(sentence);
        currentLength += sentence.length + 1; // +1 for space
      }
      
      if (currentChunk.length > 0) {
        chunks.push({ text: currentChunk.join(' ') });
      }
    }
  }
  
  return chunks;
}

function chunkCodeText(text) {
  const chunks = [];
  const lines = text.split('\n');
  let currentChunk = [];
  let currentLength = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (currentLength + line.length > chunkSize && currentChunk.length > 0) {
      chunks.push({ text: currentChunk.join('\n') });
      currentChunk = currentChunk.slice(-Math.floor(chunkOverlap / 20)); // Keep some overlap
      currentLength = currentChunk.join('\n').length;
    }
    
    currentChunk.push(line);
    currentLength += line.length + 1; // +1 for newline
    
    // If we've reached the end, add the last chunk
    if (i === lines.length - 1 && currentChunk.length > 0) {
      chunks.push({ text: currentChunk.join('\n') });
    }
  }
  
  return chunks;
}
