---
"open-composer": minor
"@open-composer/posthog-worker": patch
---

feat: implement command builder pattern for CLI architecture

- Refactored all CLI commands to use new CommandBuilder pattern with proper TypeScript interfaces
- Added CommandMetadata interface for standardized command documentation
- Created CommandBuilder interface that provides both command and metadata
- Updated all command files (agents, cache, composer, config, gh-pr, git-worktree, sessions, settings, spawn, stack, status, telemetry, tui) to use the new pattern
- Enhanced main index.ts with better organization and global error handlers
- Improved type safety and code organization across the CLI
- Fixed formatting and linting issues in workers/posthog test setup

This update modernizes the CLI architecture by introducing a consistent command builder pattern that improves type safety, code organization, and maintainability while maintaining backward compatibility.