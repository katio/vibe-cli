# Vibe CLI

A powerful CLI tool for "vibe coding" and development assistance. This tool helps you load, index, and query your codebase using AI-powered semantic search.

## Features

- Load and index codebases with smart chunking
- Ask questions about your code in natural language
- Supports multiple LLM providers (OpenAI, Anthropic, Gemini)
- Local SQLite database with vector embeddings for fast semantic search
- Cross-platform (Linux, macOS, Windows with WSL or Git Shell)

## Prerequisites

- Node.js 16 or higher
- npm or yarn
- SQLite with sqlite-vec extension (see setup instructions below)
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

## Setting up sqlite-vec

1. Download the appropriate pre-built binary for your platform from the [sqlite-vec releases page](https://github.com/asg017/sqlite-vec/releases)

2. Place the downloaded file (e.g., `vector0.dylib` for macOS, `vector0.so` for Linux, `vector0.dll` for Windows) in the project root or a known library path

3. Make sure the file is executable (on Unix-like systems):
   ```bash
   chmod +x vector0.*
   ```

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

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## Acknowledgements

- [sqlite-vec](https://github.com/asg017/sqlite-vec) for vector similarity search
- [OpenAI](https://openai.com/), [Anthropic](https://www.anthropic.com/), and [Google AI](https://ai.google.dev/) for their LLM APIs
- All the amazing open-source libraries that make this project possible
