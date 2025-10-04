# open-composer

## 0.8.8

### Patch Changes

- [#245](https://github.com/shunkakinoki/open-composer/pull/245) [`29f6114`](https://github.com/shunkakinoki/open-composer/commit/29f6114d95acbbf500e9a68aad67069c04ac6608) Thanks [@shunkakinoki](https://github.com/shunkakinoki)! - Add pr number for status

## 0.8.7

### Patch Changes

- [#242](https://github.com/shunkakinoki/open-composer/pull/242) [`0312fe6`](https://github.com/shunkakinoki/open-composer/commit/0312fe65cbdddf5c70052afebeb9598d65e7a3a2) Thanks [@shunkakinoki](https://github.com/shunkakinoki)! - Update bun dependencies

## 0.8.6

### Patch Changes

- [#236](https://github.com/shunkakinoki/open-composer/pull/236) [`bc7386e`](https://github.com/shunkakinoki/open-composer/commit/bc7386e7afee4a37e24a6cebeb194b395235c4ca) Thanks [@shunkakinoki](https://github.com/shunkakinoki)! - Fix binary naming consistency in CLI installation scripts

  Update postinstall.mjs and preinstall.mjs to use "open-composer" instead of "opencomposer" for binary names, ensuring consistency with the project naming convention.

- [#239](https://github.com/shunkakinoki/open-composer/pull/239) [`88e01b8`](https://github.com/shunkakinoki/open-composer/commit/88e01b87287e0c2054f90013bee67009b7428162) Thanks [@shunkakinoki](https://github.com/shunkakinoki)! - Migrate `opencomposer` to `open-composer`

## 0.8.5

### Patch Changes

- [#234](https://github.com/shunkakinoki/open-composer/pull/234) [`89baab2`](https://github.com/shunkakinoki/open-composer/commit/89baab21c5a8b79f8ab6fd805b608059b9f87556) Thanks [@shunkakinoki](https://github.com/shunkakinoki)! - bump release

## 0.8.4

### Patch Changes

- [#230](https://github.com/shunkakinoki/open-composer/pull/230) [`b7b1b60`](https://github.com/shunkakinoki/open-composer/commit/b7b1b60e1ee06f2e529f3340a6f2a506627bd3b7) Thanks [@shunkakinoki](https://github.com/shunkakinoki)! - Fix CLI binary naming consistency from `opencomposer` to `open-composer` and improve installation script error handling for better reliability.

## 0.8.3

### Patch Changes

- [#221](https://github.com/shunkakinoki/open-composer/pull/221) [`854a77e`](https://github.com/shunkakinoki/open-composer/commit/854a77ecc646b5f3937054b17d8555e3a42f76ad) Thanks [@shunkakinoki](https://github.com/shunkakinoki)! - Bump release

## 0.8.2

### Patch Changes

- [#219](https://github.com/shunkakinoki/open-composer/pull/219) [`26bd213`](https://github.com/shunkakinoki/open-composer/commit/26bd2131a157b73f891e9cf995db11a157f7d71c) Thanks [@shunkakinoki](https://github.com/shunkakinoki)! - Only latest release

## 0.8.1

### Patch Changes

- [#213](https://github.com/shunkakinoki/open-composer/pull/213) [`e0cd540`](https://github.com/shunkakinoki/open-composer/commit/e0cd540c904f1967509ed168c65c370da84369cb) Thanks [@shunkakinoki](https://github.com/shunkakinoki)! - Fix Docker container git configuration permissions issue by ensuring proper directory ownership for the runner user and setting bash as the default shell for RUN commands.

## 0.8.0

### Minor Changes

- [#182](https://github.com/shunkakinoki/open-composer/pull/182) [`64d01c8`](https://github.com/shunkakinoki/open-composer/commit/64d01c89ab9e0dc323d6e57b7152dd0067e60185) Thanks [@shunkakinoki](https://github.com/shunkakinoki)! - feat: implement command builder pattern for CLI architecture

  - Refactored all CLI commands to use new CommandBuilder pattern with proper TypeScript interfaces
  - Added CommandMetadata interface for standardized command documentation
  - Created CommandBuilder interface that provides both command and metadata
  - Updated all command files (agents, cache, composer, config, gh-pr, git-worktree, sessions, settings, spawn, stack, status, telemetry, tui) to use the new pattern
  - Enhanced main index.ts with better organization and global error handlers
  - Improved type safety and code organization across the CLI
  - Fixed formatting and linting issues in workers/posthog test setup

  This update modernizes the CLI architecture by introducing a consistent command builder pattern that improves type safety, code organization, and maintainability while maintaining backward compatibility.

- [#173](https://github.com/shunkakinoki/open-composer/pull/173) [`22aecb4`](https://github.com/shunkakinoki/open-composer/commit/22aecb4eedb36be8b6f08ff6a4e74baed95ea2f8) Thanks [@shunkakinoki](https://github.com/shunkakinoki)! - feat: implement dynamic help text generation for CLI

  - Added dynamic help text generation that automatically displays available commands
  - Improved config clear functionality to properly reset to default state
  - Enhanced CLI user experience with better command discovery
  - Fixed telemetry consent prompt to skip during config clear operations
  - Added comprehensive test coverage for new functionality

  This update makes the CLI more user-friendly by automatically generating help text based on available commands, while also improving the configuration management experience.

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

- [#187](https://github.com/shunkakinoki/open-composer/pull/187) [`52f212e`](https://github.com/shunkakinoki/open-composer/commit/52f212ee582c25080eb2a921631f136df176e586) Thanks [@shunkakinoki](https://github.com/shunkakinoki)! - feat: add test mode support and enhance session management

  - Added test mode support to avoid interactive prompts in session commands
  - Enhanced session management with improved logging and error handling
  - Implemented command builder pattern for better CLI architecture
  - Added comprehensive test coverage for process runner functionality
  - Improved user experience with better command discovery and session handling

  This update makes the CLI more robust for automated testing scenarios while improving the overall session management experience.

### Patch Changes

- [#191](https://github.com/shunkakinoki/open-composer/pull/191) [`2c3a779`](https://github.com/shunkakinoki/open-composer/commit/2c3a7794c2a0529b13b48dfc3705e69101a3de23) Thanks [@shunkakinoki](https://github.com/shunkakinoki)! - chore: remove unused node-pty dependency

  - Removed node-pty package from root package.json dependencies
  - Updated bun.lock to reflect dependency removal
  - This dependency was no longer needed and has been cleaned up

- Updated dependencies [[`22aecb4`](https://github.com/shunkakinoki/open-composer/commit/22aecb4eedb36be8b6f08ff6a4e74baed95ea2f8), [`0734ad1`](https://github.com/shunkakinoki/open-composer/commit/0734ad16f52410c687b0be44bb786a56f94d832a), [`52f212e`](https://github.com/shunkakinoki/open-composer/commit/52f212ee582c25080eb2a921631f136df176e586)]:
  - @open-composer/config@0.2.0
  - @open-composer/tmux@0.2.0
  - @open-composer/process-runner@0.2.0

## 0.7.1

### Patch Changes

- df9e73f: Add session create interactive

## 0.7.0

### Minor Changes

- 201cb49: Add PR creation and sessions commands to the CLI with database integration

### Patch Changes

- Updated dependencies [201cb49]
  - @open-composer/db@0.4.0
  - @open-composer/gh-pr@0.2.0
  - @open-composer/gh@0.2.0

## 0.6.1

### Patch Changes

- 7873fd3: fix: resolve CLI command test errors

  - Export individual subcommand builders for proper testing
  - Fix handler argument expectations in command definitions
  - Simplify command structure tests to avoid type issues
  - Update mock setups for better test reliability

- Updated dependencies [3d93b2c]
  - @open-composer/db@0.3.0

## 0.6.0

### Minor Changes

- b36156b: Add database and settings snapshot functionality

  ### Database Enhancements

  - Add comprehensive database snapshot functions (`createDatabaseSnapshot`, `createSettingsSnapshot`, `restoreSettingsSnapshot`)
  - Add migration status tracking (`getMigrationStatus`)
  - Add database schema validation (`validateDatabaseSchema`)
  - Implement dynamic migration discovery from filesystem
  - Add users table schema with proper TypeScript types

  ### CLI Improvements

  - Add complete settings management CLI commands (`settings get/set/list/delete`)
  - Add table formatting for settings list output
  - Fix table formatting crash with proper column width calculations
  - Integrate settings service with CLI application

  ### Testing & Quality

  - Add comprehensive test suite for all snapshot functions
  - Test settings backup/restore workflow end-to-end
  - Add schema validation and migration status tests
  - Ensure type safety with proper TypeScript types

  ### Technical Details

  - Uses Effect-TS for type-safe database operations
  - Implements proper error handling and type assertions
  - Maintains backward compatibility with existing functionality
  - Follows established patterns for CLI command structure

### Patch Changes

- e59be46: Refactor CLI components - organize imports and formatting

  - Organize imports and improve code formatting in CLI components
  - Remove unnecessary biome-ignore comments for import organization
  - Update ChatInterface, CodeEditor, ComposerApp, Layout, and Sidebar components
  - Improve code consistency and formatting across CLI interface

  Addresses formatting and import organization improvements.

- Updated dependencies [b36156b]
  - @open-composer/db@0.2.0

## 0.5.0

### Minor Changes

- ca5ae26: feat: implement interactive telemetry consent prompt

  Replace console-based telemetry consent with interactive Ink-based UI

  - Add TelemetryConsentPrompt component with keyboard navigation
  - Update config service to show consent prompt on first run
  - Improve user experience with clear privacy messaging
  - Add proper keyboard navigation (arrows, Enter, Esc)
  - Enhanced consent tracking with timestamp recording

## 0.4.1

### Patch Changes

- 51ef0e1: Update release workflow and prepublish scripts

  - Updated GitHub Actions release workflow configuration
  - Modified prepublish script for improved package publishing
  - Ensured consistent release process across packages

## 0.4.0

### Minor Changes

- f7c679c: Update GitHub Actions workflow for automated TODO tracking

  feat: add GitHub workflow for automated TODO tracking

  - Renamed job from "build" to "todo" for clarity
  - Added timeout configuration (3 minutes) for workflow efficiency
  - Updated GitHub Actions workflows and CI/CD configuration

## 0.3.18

### Patch Changes

- 4853e3a: feat: update telemetry and posthog integration

  - Enhanced telemetry service with improved PostHog client configuration
  - Updated PostHog worker with better rate limiting and CORS handling
  - Improved error handling and request timeout settings
  - Added proper anonymous event tracking for privacy compliance

## 0.3.17

### Patch Changes

- cc2caa1: Add windows release fix cmd

## 0.3.16

### Patch Changes

- 43216a8: Fix windows installation

## 0.3.15

### Patch Changes

- 71c4aaf: Add installation flow

## 0.3.14

### Patch Changes

- ddd2eae: Add workflow release

## 0.3.13

### Patch Changes

- 267ea16: Fix `'node:fs' does not provide an export named 'fs'` error

## 0.3.12

### Patch Changes

- a402360: Add cli release

## 0.3.11

### Patch Changes

- 1578462: Add prepublishOnly flow

## 0.3.10

### Patch Changes

- 8def801: Add prepublishOnly flow

## 0.3.9

### Patch Changes

- 829e8c0: Add open-composer preparation destination
- Updated dependencies [829e8c0]
  - @open-composer/agent-router@0.2.1
  - @open-composer/git@0.1.1
  - @open-composer/git-stack@0.1.1
  - @open-composer/git-worktrees@0.2.2

## 0.3.8

### Patch Changes

- bff86af: Add prepublishOnly changes

## 0.3.7

### Patch Changes

- 3a734cc: Add release

## 0.3.6

### Patch Changes

- f8fb9d4: Add changesets release

## 0.3.5

### Patch Changes

- 34e1715: Add correct naming

## 0.3.4

### Patch Changes

- 97b07f4: Add npm config token cmd

## 0.3.3

### Patch Changes

- 8fafe61: Add version release

## 0.3.2

### Patch Changes

- e635bba: Add `bun run publish:packages` to defer publishing command to `bun run publish.ts`

## 0.3.1

### Patch Changes

- a4fdd97: Fix 413 Payload Too Large error with custom publish script

## 0.3.0

### Minor Changes

- 488280e: Improved CLI publishing and distribution workflow with enhanced version detection, cross-platform binary compilation, and Windows compatibility.

## 0.2.0

### Minor Changes

- 1a54539: **New Package**: Extracted agent-router functionality into a separate `@open-composer/agent-router` package with full Effect-based implementation for better modularity and reusability.

  **CLI Enhancement**: Added comprehensive agent management commands including:

  - `agents list` - List available agents
  - `agents activate <agent>` - Activate a specific agent
  - `agents deactivate <agent>` - Deactivate a specific agent
  - `agents route <query>` - Route queries through the agent system

  **Type Safety**: Fixed TypeScript compilation errors with proper Effect CLI Option type handling.

  **Architecture**: Improved separation of concerns with dedicated AgentCli service and modular package structure.

### Patch Changes

- Updated dependencies [1a54539]
  - @open-composer/agent-router@0.2.0

## 0.1.2

### Patch Changes

- 7616569: Improve git worktrees implementation and fix CLI integration

  - Enhanced error handling and parsing logic in git-worktrees package
  - Updated CLI to properly integrate with git-worktrees functionality
  - Fixed index.ts structure and removed old cli entry point
  - Improved worktree management and Git operations

- Updated dependencies [7616569]
  - @open-composer/git-worktrees@0.2.1

## 0.1.1

### Patch Changes

- Updated dependencies [2eb1e7f]
  - @open-composer/git-worktrees@0.2.0
