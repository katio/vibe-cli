# Vibe CLI - Project Context

## Project Overview
Vibe CLI is a powerful command-line interface tool that enables local AI-powered document search and Q&A using vector embeddings. It allows users to index their codebase or documentation and ask natural language questions to get relevant answers.

## Core Features

### AI-Powered Tools
- **Natural Language Search**: Find code using semantic similarity
- **Code Analysis**: Get explanations and documentation for code
- **Safe Command Execution**: Run terminal commands with AI assistance (requires approval)
- **Multi-Provider Support**: Works with OpenAI, Anthropic, and Google Gemini

### Key Functionality
- **Local SQLite Database**: Fast semantic search with vector embeddings
- **Multi-Folder Support**: Load and switch between multiple codebases
- **Smart Command Parsing**: Commands work with or without leading '/'
- **Interactive & Direct Modes**: Use interactively or run direct commands
- **Context-Aware**: Maintains folder context and command history

## Technical Stack

### Core Technologies
- **Node.js**: JavaScript runtime
- **SQLite with sqlite-vec**: Local vector database for semantic search
- **LLM Integrations**:
  - OpenAI (GPT models)
  - Anthropic (Claude models)
  - Google Gemini

### Key Dependencies
- **better-sqlite3**: SQLite database driver
- **sqlite-vec**: Vector similarity search extension
- **inquirer**: Interactive command line interfaces
- **chalk**: Terminal string styling
- **dotenv**: Environment variable management

## Project Structure

```
src/
  ├── cli/               # CLI interface and commands
  ├── commands/          # Command implementations
  ├── config/           # Configuration management
  ├── services/         # Core services (database, LLM, etc.)
  │   ├── database.js   # Database operations
  │   ├── llm/         # LLM provider integrations
  │   └── tools/       # AI tools implementation
  ├── prompts/         # System and user prompts
  └── utils/           # Utility functions
```

## Development Guidelines

### Code Style
- Use ES Modules (import/export)
- Follow JavaScript Standard Style
- Use async/await for asynchronous operations
- Document all public functions with JSDoc

### Error Handling
- Always handle errors gracefully
- Provide helpful error messages
- Use custom error classes when appropriate
- Log errors with appropriate levels

### Testing
- Write tests for all new features
- Use Mocha for unit and integration tests
- Maintain good test coverage
- Test error cases and edge cases

## Future Roadmap

### Short-term Goals
- [ ] Improve command parsing and error handling
- [ ] Add more AI tools and integrations
- [ ] Enhance documentation and examples

### Long-term Vision
- [ ] Support for more LLM providers
- [ ] Plugin system for extending functionality
- [ ] Web interface for visualization
- [ ] Integration with code editors

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- API key for at least one LLM provider (OpenAI, Anthropic, or Google Gemini)

### Setup and Running

```bash
# Clone and setup
gh repo clone yourusername/vibe-cli
cd vibe-cli
npm install
cp .env.example .env  # Add your API keys here

# Run in interactive mode
npm start
# or with npx (without local install)
npx @vibe/cli
```

### Basic Usage Examples

#### Interactive Mode
```
> /load /path/to/your/code
> /ask "Explain the main components"
> /folders
> /use 1
> /explain "How does the database work?"
```

#### Direct Commands
```bash
# Load a codebase and query it
npm start -- load /path/to/your/code
npm start -- ask "Show me the main components"

# Using npx (without local install)
npx @vibe/cli load /path/to/your/code
npx @vibe/cli ask "Explain the authentication flow"
```

#### Development Mode
For development, you can use watch mode to automatically restart on changes:
```bash
npm run dev  # Uses nodemon to watch for changes
```

## Contributing
Contributions are welcome! Please read our [Contributing Guidelines](CONTRIBUTING.md) for details on how to contribute to this project.
