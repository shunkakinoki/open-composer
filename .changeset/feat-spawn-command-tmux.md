---
"@open-composer/tmux": minor
"open-composer": minor
---

feat: add spawn command with tmux integration for multi-agent development

Added a new `spawn` command that enables developers to launch multiple AI agents in separate git worktrees with dedicated tmux sessions. This feature supports parallel development workflows with different AI agents including codex, claude-code, and opencode.

**Key Features:**
- Interactive agent selection and configuration via SpawnPrompt component
- Automatic worktree creation for each agent with base branch selection
- Tmux session management for isolated development environments
- Optional PR creation for spawned worktrees
- Comprehensive status reporting and error handling
- Support for both interactive and non-interactive modes

**Usage:**
```bash
open-composer spawn                    # Interactive mode
open-composer spawn my-session --agents codex,claude-code --base main --create-pr
```

This enhancement significantly improves the multi-agent development experience by providing isolated environments for each AI agent while maintaining organized project structure.