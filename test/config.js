// Test configuration
// Copy this to .env in the project root for local testing

export const TEST_CONFIG = {
  // Set these in your .env file for testing
  // OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  // ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  // GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  
  // Test settings
  TEST_FOLDER: process.cwd(),
  LOG_LEVEL: 'debug',
  
  // LLM Provider (uncomment one)
  // LLM_PROVIDER: 'openai',
  // LLM_PROVIDER: 'anthropic',
  // LLM_PROVIDER: 'gemini',
  
  // Model settings
  OPENAI_MODEL: 'gpt-4-turbo',
  ANTHROPIC_MODEL: 'claude-3-opus-20240229',
  GEMINI_MODEL: 'gemini-pro'
};

// Validate configuration
function validateConfig() {
  const requiredVars = [];
  
  if (process.env.OPENAI_API_KEY) {
    if (!process.env.LLM_PROVIDER) process.env.LLM_PROVIDER = 'openai';
  } else if (process.env.ANTHROPIC_API_KEY) {
    if (!process.env.LLM_PROVIDER) process.env.LLM_PROVIDER = 'anthropic';
  } else if (process.env.GEMINI_API_KEY) {
    if (!process.env.LLM_PROVIDER) process.env.LLM_PROVIDER = 'gemini';
  } else {
    requiredVars.push('One of: OPENAI_API_KEY, ANTHROPIC_API_KEY, or GEMINI_API_KEY');
  }
  
  if (requiredVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    console.error(requiredVars.map(v => `  - ${v}`).join('\n'));
    console.error('\nPlease create a .env file based on .env.example');
    process.exit(1);
  }
  
  console.log(`✅ Using ${process.env.LLM_PROVIDER.toUpperCase()} as the LLM provider`);
}

export { validateConfig };
