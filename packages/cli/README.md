# Open Composer CLI

A chat-first terminal UI orchestrator for multiple AI coding agents.

## Overview

Open Composer CLI is a TUI (Text User Interface) that orchestrates multiple AI agents in a single terminal environment. It provides a chat interface to interact with various coding agents while managing Git worktrees for isolated development.

## Features

- **Chat Interface**: Natural language interaction with AI agents
- **Multi-Agent Support**: Claude Code, Codex Nation, Cursor Agent, and more
- **Git Worktree Integration**: Isolated branch-specific workspaces
- **TUI Layout**: Split-pane interface with sidebar, chat, and code editor
- **Agent Routing**: Intelligent agent selection based on query context

## Quick Start

```bash
# Run in development mode
bun run dev

# Build the CLI
bun run build

# Run tests
bun run test
```

## Architecture

### Components

- **ComposerApp**: Main application component
- **ChatInterface**: Central chat pane for agent communication
- **Sidebar**: Displays worktrees, branches, and active agents
- **CodeEditor**: File browser and code display
- **Layout**: Overall TUI layout management

### Core Libraries

- **WorktreeManager**: Git worktree operations
- **AgentRouter**: Agent selection and query routing

## Usage

The CLI launches a TUI with three main panes:

1. **Left Sidebar**: Workspaces, branches, and agents
2. **Center Chat**: Conversation with AI agents
3. **Right Panel**: File tree and code editor

Type messages in the chat interface to interact with agents. The router automatically selects appropriate agents based on your query content.

## Agents

- 🤖 **claude-code**: Code review & planning
- 📝 **codex-nation**: Code generation
- 🖱️ **cursor-agent**: UI/UX implementation
- 🌐 **open-code**: Open-source snippet sourcing
- ⚡ **kilo-code**: Performance optimization

## Development

Built with:
- **Ink**: React for CLI interfaces
- **React**: Component architecture
- **TypeScript**: Type safety
- **Bun**: Runtime and package manager