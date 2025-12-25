#!/bin/bash
# Pre-commit hook to update documentation automatically
# This script calls the Claude Code docs-updater agent

# Check if there are staged changes in src/ directory
STAGED_SRC_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep '^src/.*\.ts$' | grep -v '__tests__' | grep -v '\.test\.ts$')

# If no relevant source files changed, exit
if [ -z "$STAGED_SRC_FILES" ]; then
  exit 0
fi

# Output in JSON format for Claude Code hook system
cat << 'EOF'
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "allow",
    "message": "Source files changed - triggering documentation update check"
  }
}
EOF

exit 0
