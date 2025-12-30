# Documentation Auto-Update System

Automatic documentation update system for the THREE Play project.

## How It Works

The system uses a **docs-updater** sub-agent that analyzes git changes and automatically updates the documentation in the `.claude/docs` folder.

## Usage

### Manual Execution

When you add a new feature or modify an existing one, simply ask Claude:

```
Update documentation based on the last commit
```

Claude will automatically launch the docs-updater agent, which:
1. ✅ Analyzes the git diff
2. ✅ Determines if documentation update is needed
3. ✅ Updates the relevant `.claude/docs/*.md` files
4. ✅ Stages the updated documentation

### Automatic Execution (Optional)

If you want to fully automate this, you can create a git pre-commit hook:

1. Create the `.git/hooks/pre-commit` file:
```bash
#!/bin/bash
# Check if there are src/ changes
STAGED_SRC=$(git diff --cached --name-only | grep '^src/.*\.ts$' | grep -v '__tests__')

if [ -n "$STAGED_SRC" ]; then
  echo "📚 Changes detected - recommended: update documentation"
  echo "Run: 'Update documentation based on staged changes'"
fi
```

2. Make it executable:
```bash
chmod +x .git/hooks/pre-commit
```

## Agent Configuration

The agent is defined in [.claude/agents/docs-updater.json](../.claude/agents/docs-updater.json).

**Important rules:**
- ✅ Updates docs: NEW feature, API change, behavior change
- ❌ Does NOT update: bug fix, refactor, test change, internal modification

## Hooks

- **post-commit-notify.sh** - PostToolUse hook that notifies when documentation update may be needed
- **pre-commit-docs.sh** - PreToolUse hook placeholder (currently not active)

## Example Workflow

```bash
# 1. Development
vim src/core/units.ts  # Add new feature

# 2. Stage changes
git add src/core/units.ts

# 3. Commit
git commit -m "feat(units): add health regeneration"

# 4. Documentation update (manual trigger in Claude)
# "Update documentation based on the last commit"

# 5. Commit the updated documentation
git commit -m "docs: update units documentation for health regen"
```

## Troubleshooting

### Agent doesn't find changes
- Check if you committed the changes
- Run: `git log -1 --stat` to see the last commit content

### Agent updates too many files
- The agent is autonomous - if there are many changes, it will update many docs
- Suggestion: smaller, focused commits

### Hooks don't run
- Check: `.claude/settings.local.json` contains the hooks configuration
- Check: hook scripts are executable (`chmod +x .claude/hooks/*.sh`)
