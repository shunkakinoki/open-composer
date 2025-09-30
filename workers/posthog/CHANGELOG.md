# @open-composer/posthog-worker

## 1.0.3

### Patch Changes

- [#182](https://github.com/shunkakinoki/open-composer/pull/182) [`64d01c8`](https://github.com/shunkakinoki/open-composer/commit/64d01c89ab9e0dc323d6e57b7152dd0067e60185) Thanks [@shunkakinoki](https://github.com/shunkakinoki)! - feat: implement command builder pattern for CLI architecture

  - Refactored all CLI commands to use new CommandBuilder pattern with proper TypeScript interfaces
  - Added CommandMetadata interface for standardized command documentation
  - Created CommandBuilder interface that provides both command and metadata
  - Updated all command files (agents, cache, composer, config, gh-pr, git-worktree, sessions, settings, spawn, stack, status, telemetry, tui) to use the new pattern
  - Enhanced main index.ts with better organization and global error handlers
  - Improved type safety and code organization across the CLI
  - Fixed formatting and linting issues in workers/posthog test setup

  This update modernizes the CLI architecture by introducing a consistent command builder pattern that improves type safety, code organization, and maintainability while maintaining backward compatibility.

## 1.0.2

### Patch Changes

- 4853e3a: feat: update telemetry and posthog integration

  - Enhanced telemetry service with improved PostHog client configuration
  - Updated PostHog worker with better rate limiting and CORS handling
  - Improved error handling and request timeout settings
  - Added proper anonymous event tracking for privacy compliance

## 1.0.1

### Patch Changes

- 829e8c0: Add open-composer preparation destination
