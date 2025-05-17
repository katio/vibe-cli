import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { logger } from '../utils/logger.js';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

// Load default configuration
const defaultConfigPath = path.join(__dirname, 'default.json');
let config = {};

try {
  const configFile = fs.readFileSync(defaultConfigPath, 'utf8');
  config = JSON.parse(configFile);
} catch (error) {
  logger.error(`Failed to load configuration: ${error.message}`);
  process.exit(1);
}

// Apply environment overrides
config.dbPath = process.env.DB_PATH || './vibe-db.sqlite';
config.logLevel = process.env.LOG_LEVEL || 'info';

// Validate active provider
const validProviders = ['openai', 'anthropic', 'gemini'];
if (!validProviders.includes(config.activeProvider)) {
  logger.warn(
    `Invalid activeProvider '${config.activeProvider}' in config, defaulting to 'openai'`
  );
  config.activeProvider = 'openai';
}

// Get active provider configuration
const activeProviderConfig = config.llmModels[config.activeProvider];

// Validate embedding configuration
if (config.activeProvider === 'anthropic' && !activeProviderConfig.embeddingModel) {
  logger.warn(
    'Anthropic does not provide an embedding model. Falling back to OpenAI for embeddings.'
  );
  // Fall back to OpenAI for embeddings if available
  if (config.llmModels.openai && process.env.OPENAI_API_KEY) {
    config.embeddingProvider = 'openai';
  } else {
    logger.error(
      'No embedding provider available. Please configure OpenAI or another supported provider.'
    );
    process.exit(1);
  }
} else {
  config.embeddingProvider = config.activeProvider;
}

// Get embedding dimension
config.embeddingDimension =
  activeProviderConfig.embeddingDimension ||
  config.llmModels[config.embeddingProvider]?.embeddingDimension;

if (!config.embeddingDimension) {
  logger.error('Could not determine embedding dimension from configuration');
  process.exit(1);
}

// API keys
config.apiKeys = {
  openai: process.env.OPENAI_API_KEY,
  anthropic: process.env.ANTHROPIC_API_KEY,
  gemini: process.env.GEMINI_API_KEY,
};

// Validate API key for active provider
if (!config.apiKeys[config.activeProvider]) {
  logger.error(
    `API key for ${config.activeProvider} is not set. Please set the ${config.activeProvider.toUpperCase()}_API_KEY environment variable.`
  );
  process.exit(1);
}

// Validate embedding provider API key if different
if (config.embeddingProvider !== config.activeProvider && !config.apiKeys[config.embeddingProvider]) {
  logger.error(
    `API key for embedding provider ${config.embeddingProvider} is not set. Please set the ${config.embeddingProvider.toUpperCase()}_API_KEY environment variable.`
  );
  process.exit(1);
}

export { config };
