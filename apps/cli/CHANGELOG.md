# open-composer

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
