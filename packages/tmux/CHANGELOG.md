# Changelog

## 0.2.0

### Minor Changes

- [#165](https://github.com/shunkakinoki/open-composer/pull/165) [`0734ad1`](https://github.com/shunkakinoki/open-composer/commit/0734ad16f52410c687b0be44bb786a56f94d832a) Thanks [@shunkakinoki](https://github.com/shunkakinoki)! - feat: add spawn command with tmux integration for multi-agent development

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

All notable changes to `@open-composer/tmux` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-01-28

### Added

- Initial implementation of TmuxService
- Support for creating new tmux sessions with custom commands
- Session listing and management functionality
- PID retrieval for tmux sessions
- Session killing functionality
- Availability checking for tmux
