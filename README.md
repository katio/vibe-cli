# Vibe CLI

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

Vibe CLI is a powerful command-line tool that enables local AI-powered document search and Q&A using vector embeddings. It allows you to index your codebase or documentation and ask natural language questions to get relevant answers.

## ✨ Features
- Local SQLite database with vector embeddings for fast semantic search
- Cross-platform (Linux, macOS, Windows with WSL or Git Shell)
- Automatic vector embeddings with sqlite-vec (no manual setup required)

## Prerequisites

- Node.js 16 or higher
- npm or yarn
- API key for at least one LLM provider (OpenAI, Anthropic, or Google Gemini)

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/vibe-cli.git
   cd vibe-cli
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up your environment variables:
   ```bash
   cp .env.example .env
   ```
   Then edit `.env` to add your API keys.

## Configuration

Edit `src/config/default.json` to configure:

- Active LLM provider
- Model settings
- Chunking parameters
- File extensions to process
- Directories to ignore

## Usage

### Interactive Mode

Start the interactive shell:

```bash
npm start interactive
# or
./src/index.js interactive
```

### Commands

- `/load <path>` - Load a directory into the knowledge base
- `/ask <question>` - Ask a question about your codebase
- `/help` - Show help information
- `/exit` or `/quit` - Exit the application

### Direct Commands

You can also run commands directly:

```bash
# Load a directory
npm start load /path/to/your/code

# Ask a question
npm start ask "How does the authentication work?"
```

## Development

### Scripts

- `npm start` - Start the application
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode

### Environment Variables

- `OPENAI_API_KEY` - OpenAI API key
- `ANTHROPIC_API_KEY` - Anthropic API key
- `GEMINI_API_KEY` - Google Gemini API key
- `DB_PATH` - Path to SQLite database (default: `./vibe-db.sqlite`)
- `LOG_LEVEL` - Logging level (default: `info`)

## License

MIT

## 🧪 Testing

To run the test suite:

```bash
# Install development dependencies
npm install

# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details on how to contribute to this project.

## Acknowledgements

- [sqlite-vec](https://github.com/asg017/sqlite-vec) for vector similarity search
- [OpenAI](https://openai.com/), [Anthropic](https://www.anthropic.com/), and [Google AI](https://ai.google.dev/) for their LLM APIs
- All the amazing open-source libraries that make this project possible
