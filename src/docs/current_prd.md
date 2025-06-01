# Vibe CLI - Current PRD

## Core Features to Implement

### Command Parser Improvements
- [ ] Fix command parsing to handle input without leading '/'
- [ ] When no '/' is used, assume it's an '/ask' command
- [ ] Show helpful error messages when no folder is loaded
- [ ] Display current folder context in the prompt

### Folder Management
- [ ] Auto-select folder after loading (as if '/use' was called)
- [ ] Add '/folders' command to list all loaded folders with:
  - ID (consecutive integer starting at 1)
  - Folder Name
  - Load timestamp
- [ ] Add '/use' command to switch between loaded folders
  - Support both folder name and ID as arguments
- [ ] Add '/reset' command to reset the database to default state

### Help System
- [ ] Update '/help' command to include:
  - All available commands with descriptions
  - Command shortcuts (first letter only)
  - Examples of command usage
- [ ] Add support for these shortcuts:
  - /l - /load
  - /a - /ask
  - /q - /quit
  - /h - /help
  - /f - /folders
  - /u - /use
  - /r - /reset

## Implementation Notes
- All commands should be case-insensitive
- Provide clear, user-friendly error messages
- Maintain backward compatibility with existing commands
- Update README.md with new command references

## Testing Requirements
- Test all new commands and shortcuts
- Verify folder context switching works correctly
- Test error conditions and edge cases
- Ensure backward compatibility with existing functionality