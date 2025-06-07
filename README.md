# Vibe CLI

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

Vibe CLI is a powerful command-line tool that enables local AI-powered document search, code analysis, and task automation using vector embeddings. It allows you to index your codebase, ask natural language questions, and even execute commands with AI assistance.

## 🚀 New: AI-Powered Tools

Vibe CLI now includes advanced AI tools that understand and interact with your codebase:

- **Smart Code Search**: Find code using natural language queries
- **File Analysis**: Get analysis of any file
- **Command Execution**: Safely execute terminal commands with AI assistance
- **Multi-Provider Support**: Works with OpenAI, Anthropic, and Google Gemini

Try it out:
```bash
# Ask about your code
vibe ask "How does the database initialization work?"

# Find related code
vibe ask "Show me authentication middleware"

# Get help with terminal commands
vibe ask "How do I list all TypeScript files?"
```

## ✨ Features

### Core Features
- **Local SQLite Database**: Fast semantic search with vector embeddings
- **Multi-Folder Support**: Load and switch between multiple codebases
- **Smart Command Parsing**: Commands work with or without leading '/'
- **Command Shortcuts**: Quick access to common commands (e.g., /l for /load, /a for /ask)
- **Interactive & Direct Modes**: Use interactively or run direct commands

### AI-Powered Tools
- **Natural Language Search**: Find code using plain English
- **Code Analysis**: Get explanations and documentation
- **Safe Command Execution**: Run terminal commands with AI assistance
- **Context-Aware Suggestions**: Get relevant suggestions based on your codebase

### Technical Features
- **Cross-Platform**: Works on Linux, macOS, and Windows (with WSL or Git Shell)
- **No Setup Required**: Automatic vector embeddings with sqlite-vec
- **Multi-LLM Support**: Choose between OpenAI, Anthropic, or Google Gemini
- **Extensible Architecture**: Easy to add new tools and providers

## Prerequisites

- Node.js 16 or higher
- npm or yarn
- API key for at least one LLM provider (OpenAI, Anthropic, or Google Gemini)

## Installation

### Prerequisites
- Node.js 18 or higher
- npm or yarn
- API key for at least one LLM provider (OpenAI, Anthropic, or Google Gemini)

### Setup

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

### Running the CLI

You can run the CLI using npm scripts:

```bash
# Start interactive mode
npm start

# Or run specific commands
npm start -- load /path/to/your/code
npm start -- ask "Your question here"

# Using npx (if you don't want to install dependencies globally)
npx @vibe/cli load /path/to/your/code
```

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

1. **Start the interactive shell**:
   ```bash
   # Using npm
   npm start
   
   # Or using npx (without local installation)
   npx @vibe/cli
   ```

2. **Ask questions**:
   ```
   /ask "How does the authentication work?"
   # or use the shortcut
   /a "How does the authentication work?"
   ```

4. **List loaded folders**:
   ```
   /folders
   # or use the shortcut
   /f
   ```

5. **Switch between folders**:
   ```
   /use 1  # Use folder with ID 1
   # or use the shortcut
   /u 1
   ```

### Direct Commands

You can also run commands directly:

```bash
# Load and query in one command
vibe load /path/to/code && vibe ask "Explain the main components"

# Use the explain command for AI assistance
vibe explain "Find all API endpoints in the codebase"

# Get help with shell commands
vibe explain "How do I find all TypeScript files modified in the last week?"

# List all loaded folders
vibe folders

# Reset the database (requires confirmation)
vibe reset
```

### Folder Management

```bash
# List loaded folders
vibe folders

# Switch to a specific folder
vibe use 1  # Use folder with ID 1

# Reset the database (requires confirmation)
vibe reset
```

### Smart Command Parsing

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
  │   ├── load.js       # Load command
  │   ├── ask.js        # Ask command
  │   ├── explain.js    # AI-powered explain command
  │   └── ...
  │
  ├── config/           # Configuration management
  │   └── default.json  # Default configuration
  │
  ├── services/        # Core services
  │   ├── database.js   # Database operations
  │   ├── llm/         # LLM provider integrations
  │   │   ├── index.js # Main LLM service
  │   │   └── providers.js # Provider implementations
  │   └── tools/       # AI tools
  │       └── index.js # Tool implementations
  │
  ├── prompts/         # System and user prompts
  │   └── system.js    # System prompt template
  │
  └── utils/          # Utility functions
      └── ...

test/                  # Test files
  └── explain-test.js  # Test for explain command

docs/                  # Documentation
  └── TOOL_USAGE.md    # Tool usage guide
```

## AI Tool Integration

Vibe CLI uses a flexible tool system that allows the AI to interact with your codebase:

1. **searchCode**: Semantic search across your codebase
2. **readFile**: Read and analyze file contents
3. **executeCommand**: Safely execute terminal commands

See [TOOL_USAGE.md](docs/TOOL_USAGE.md) for detailed documentation on using these tools.

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

## 🧪 Testing AI-Powered Features

To test the AI-powered features:

1. First, make sure you have set up your `.env` file with the required API keys (see [Prerequisites](#prerequisites))

2. Run the interactive test script:
   ```bash
   node test/interactive-test.js
   ```

3. Follow the prompts to run tests or check your configuration

4. For manual testing, you can use the `explain` command:
   ```bash
   # Interactive mode
   vibe
   > /explain How does the database initialization work?
   
   # Direct mode
   vibe explain "Find all API endpoints in the codebase"
   ```

## 🛠️ Development

### Setup

1. Fork and clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up your `.env` file
4. Build the project:
   ```bash
   npm run build
   ```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Linting and Formatting

```bash
# Run linter
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format
```

### Making a Release

1. Update the version in `package.json`
2. Update `CHANGELOG.md`
3. Commit changes with message `chore: release vX.Y.Z`
4. Create a git tag: `git tag vX.Y.Z`
5. Push changes: `git push && git push --tags`
6. Publish to npm: `npm publish`

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guidelines](CONTRIBUTING.md) for details on how to contribute to this project.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details on how to contribute to this project.

## Acknowledgements

- [sqlite-vec](https://github.com/asg017/sqlite-vec) for vector similarity search
- [OpenAI](https://openai.com/), [Anthropic](https://www.anthropic.com/), and [Google AI](https://ai.google.dev/) for their LLM APIs
- All the amazing open-source libraries that make this project possible
