# Vibe CLI

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

Vibe CLI is a powerful command-line tool that enables local AI-powered document search and Q&A using vector embeddings. It allows you to index your codebase or documentation and ask natural language questions to get relevant answers.

## ✨ Features
- **Local SQLite Database**: Fast semantic search with vector embeddings
- **Multi-Folder Support**: Load and switch between multiple codebases
- **Smart Command Parsing**: Commands work with or without leading '/'
- **Command Shortcuts**: Quick access to common commands (e.g., /l for /load, /a for /ask)
- **Interactive & Direct Modes**: Use interactively or run direct commands
- **Cross-Platform**: Works on Linux, macOS, and Windows (with WSL or Git Shell)
- **No Setup Required**: Automatic vector embeddings with sqlite-vec

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

## 🚀 Getting Started

### Installation

1. Install globally via npm:
   ```bash
   npm install -g @vibe/cli
   ```

   Or use npx:
   ```bash
   npx @vibe/cli
   ```

2. Set up your API key (required for LLM features):
   ```bash
   # For OpenAI
   export OPENAI_API_KEY='your-api-key-here'
   
   # Or for Anthropic
   export ANTHROPIC_API_KEY='your-api-key-here'
   ```

## 🖥️ Usage

### Interactive Mode

Start the interactive shell:

```bash
vibe
# or
npx @vibe/cli
```

### Commands

#### Basic Commands
- `load <path>` or `/l <path>` - Load a directory into the knowledge base
- `ask <question>` or `/a <question>` - Ask a question about your codebase
- `folders` or `/f` - List all loaded folders
- `use <id|path>` or `/u <id|path>` - Switch to a specific folder
- `reset` or `/r` - Reset the database (requires confirmation)
- `help` or `/h` - Show help information
- `exit`, `quit`, or `/q` - Exit the application

#### Direct Mode

Run commands directly without entering interactive mode:

```bash
# Load a directory
vibe load /path/to/your/code

# Ask a question
vibe ask "How does the authentication work?"

# List loaded folders
vibe folders

# Switch to a specific folder by ID or path
vibe use 1
vibe use /path/to/folder
```

#### Smart Command Parsing

- Commands work with or without leading '/'
- Input without a command is treated as an 'ask' command
- Partial command matching (e.g., 'lo' for 'load')
- Tab completion for file paths and commands

#### Examples

```bash
# These are all equivalent
/ask How does this work?
ask How does this work?
a How does this work?
How does this work?  # No command prefix needed for ask

# Load a folder
/load /path/to/project
l /path/to/project

# List folders
/folders
f

# Use a specific folder
/use 1
u 2

# Reset the database
/reset
r
```

## 🛠️ Development

### Prerequisites

- Node.js 18+
- npm or yarn
- Git

### Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/vibe-cli.git
   cd vibe-cli
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

### Scripts

- `npm start` - Start the application in interactive mode
- `npm run dev` - Start in development mode with file watching
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run build` - Build for production

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENAI_API_KEY` | OpenAI API key | - |
| `ANTHROPIC_API_KEY` | Anthropic API key | - |
| `GEMINI_API_KEY` | Google Gemini API key | - |
| `DB_PATH` | Path to SQLite database | `./vibe-db.sqlite` |
| `LOG_LEVEL` | Logging level | `info` |
| `MAX_SIMILAR_DOCUMENTS` | Max documents to return for similarity search | `5` |

### Project Structure

```
src/
  ├── cli/               # CLI interface and commands
  ├── commands/          # Command implementations
  ├── config/           # Configuration management
  ├── services/         # Core services (database, LLM, etc.)
  ├── utils/            # Utility functions
  └── cli.js            # Main entry point
```

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guidelines](CONTRIBUTING.md) for details on how to get started.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with ❤️ using Node.js
- Powered by vector embeddings and modern LLMs
- Inspired by the need for better code search and understanding tools

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
