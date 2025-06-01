import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Default configuration
const defaultConfig = {
  activeProvider: 'openai',
  llmModels: {
    openai: {
      chatModel: 'gpt-3.5-turbo',
      embeddingModel: 'text-embedding-3-small',
      embeddingDimension: 1536,
    },
    anthropic: {
      chatModel: 'claude-3-haiku-20240307',
      embeddingModel: null,
      embeddingDimension: null,
    },
    gemini: {
      chatModel: 'gemini-1.5-flash-latest',
      embeddingModel: 'text-embedding-004',
      embeddingDimension: 768,
    },
  },
  chunkSize: 1000,
  chunkOverlap: 100,
  maxSimilarDocuments: 5,
};

let config = { ...defaultConfig };

// Try to load config from file
const CONFIG_PATH = path.join(process.cwd(), 'vibe.config.json');

try {
  if (fs.existsSync(CONFIG_PATH)) {
    const fileConfig = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
    config = { ...defaultConfig, ...fileConfig };
  }
} catch (error) {
  console.error('Error loading config file, using defaults:', error.message);
}

/**
 * Get the current configuration
 * @returns {Object} The current configuration
 */
export function getConfig() {
  return config;
}

/**
 * Update the configuration
 * @param {Object} updates - Configuration updates
 */
export function updateConfig(updates) {
  config = { ...config, ...updates };
  
  // Save to file
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error saving config:', error.message);
  }
}

export default {
  getConfig,
  updateConfig,
};
