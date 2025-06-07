# Vibe CLI - Tool Usage Guide

Vibe CLI now supports AI-powered tools that can search, analyze, and interact with your codebase. This document explains how to use these tools effectively.

## Available Tools

### 1. searchCode
Searches the codebase using semantic similarity.

**Parameters:**
- `query` (string): The search query
- `limit` (number, optional): Maximum number of results (default: 5)

**Example:**
```json
{
  "tool": "searchCode",
  "parameters": {
    "query": "database initialization",
    "limit": 3
  }
}
```

### 2. readFile
Reads the contents of a file.

**Parameters:**
- `path` (string): Path to the file

**Example:**
```json
{
  "tool": "readFile",
  "parameters": {
    "path": "src/services/database.js"
  }
}
```

### 3. executeCommand
Executes a terminal command (requires user approval).

**Parameters:**
- `command` (string): The command to execute

**Example:**
```json
{
  "tool": "executeCommand",
  "parameters": {
    "command": "ls -la"
  }
}
```

## Usage Examples

### Basic Search
```bash
vibe explain "Find database initialization code"
```

### Read a File
```bash
vibe explain "Show me the database service implementation"
```

### Execute a Command
```bash
vibe explain "List all files in the current directory"
```

## Security Notes

1. **Command Execution Safety**
   - All commands require explicit user approval
   - Commands are shown before execution
   - Output is captured and shown in a controlled manner

2. **File Access**
   - Only files within the loaded folders can be accessed
   - File paths are validated before reading

3. **Rate Limiting**
   - API calls to LLM providers are rate-limited
   - Large responses are truncated to prevent excessive output

## Best Practices

1. **Be Specific**: The more specific your query, the better the results
2. **Use Queries**: Enclose multi-word queries in quotes
3. **Check Context**: The system maintains context of your current folder
4. **Review Output**: Always review command output before executing suggested commands

## Troubleshooting

If a tool isn't working as expected:
1. Check if you have the necessary permissions
2. Verify the file paths are correct
3. Ensure the required environment variables are set
4. Check the logs for detailed error messages
