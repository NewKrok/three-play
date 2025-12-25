Launch the docs-updater agent to analyze recent changes and update .claude documentation.

The agent will:
1. Review git diff (staged or recent commits)
2. Determine if documentation updates are needed
3. Automatically update relevant .claude/docs files
4. Stage the updated documentation

Use this after adding new features or modifying existing functionality.