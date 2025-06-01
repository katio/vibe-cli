# Contributing to Vibe CLI

First off, thank you for considering contributing to Vibe CLI! It's people like you that make open source such an amazing community. Here are the guidelines we'd like you to follow:

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## How Can I Contribute?

### Reporting Bugs

- **Ensure the bug was not already reported** by searching on GitHub under [Issues](https://github.com/yourusername/vibe-cli/issues).
- If you're unable to find an open issue addressing the problem, [open a new one](https://github.com/yourusername/vibe-cli/issues/new). Be sure to include:
  - A clear and descriptive title
  - A description of the expected behavior
  - Steps to reproduce the issue
  - Any relevant logs or screenshots
  - Your environment (OS, Node.js version, etc.)

### Suggesting Enhancements

- Open a new issue with a clear title and description
- Explain why this enhancement would be useful
- Include any relevant examples or screenshots

### Pull Requests

1. Fork the repository and create your branch from `main`
2. Run `npm install` to install dependencies
3. Make your changes
4. Add tests if applicable
5. Run `npm test` to ensure all tests pass
6. Run `npm run lint` to ensure code style is consistent
7. Commit your changes using a descriptive commit message
8. Push your branch and open a pull request

## Development Setup

### Prerequisites

- Node.js 18.0.0 or higher
- npm or yarn

### Installation

```bash
# Fork and clone the repository
git clone https://github.com/yourusername/vibe-cli.git
cd vibe-cli

# Install dependencies
npm install

# Create a .env file
cp .env.example .env
# Edit .env with your API keys
```

### Available Scripts

- `npm start` - Start the CLI in development mode
- `npm test` - Run tests
- `npm run lint` - Run linter
- `npm run format` - Format code with Prettier
- `npm run test:coverage` - Run tests with coverage

## Coding Guidelines

- Follow the [JavaScript Standard Style](https://standardjs.com/)
- Write meaningful commit messages
- Keep PRs focused and limited to a single feature/bugfix
- Update documentation when necessary
- Add tests for new features

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
