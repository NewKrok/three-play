#!/bin/bash
# Post-commit hook notification for documentation updates

# Read the hook input JSON from stdin
INPUT=$(cat)

# Parse to check if this was a git commit command
TOOL_NAME=$(echo "$INPUT" | grep -o '"tool_name":"[^"]*"' | cut -d'"' -f4)
COMMAND=$(echo "$INPUT" | grep -o '"command":"[^"]*"' | cut -d'"' -f4)

# Only proceed if this was a Bash tool with git commit
if [ "$TOOL_NAME" != "Bash" ] || [[ ! "$COMMAND" =~ git[[:space:]]+commit ]]; then
  # Return allow decision for non-git-commit commands
  cat << 'EOF'
{
  "hookSpecificOutput": {
    "hookEventName": "PostToolUse"
  }
}
EOF
  exit 0
fi

# Check if there were source file changes in the commit
CHANGED_FILES=$(git diff HEAD~1 HEAD --name-only 2>/dev/null | grep '^src/.*\.ts$' | grep -v '__tests__' | grep -v '\.test\.ts$')

if [ -z "$CHANGED_FILES" ]; then
  # No relevant source files changed
  cat << 'EOF'
{
  "hookSpecificOutput": {
    "hookEventName": "PostToolUse"
  }
}
EOF
  exit 0
fi

# Source files were changed - notify about documentation
cat << 'EOF'
{
  "hookSpecificOutput": {
    "hookEventName": "PostToolUse"
  },
  "notification": {
    "message": "📚 Source files were modified in this commit. Consider running: 'Update documentation based on the last commit' to sync .claude/docs",
    "level": "info"
  }
}
EOF

exit 0
