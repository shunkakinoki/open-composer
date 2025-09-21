# Open Composer CLI: Spec for a Chat-First Terminal UI Orchestrator

## Overview

**Project Name**: Open Composer CLI (inspired by `composer.build` workflows)  
**Version**: 0.1 (Spec Draft)  
**Description**: A chat-first CLI tool designed to orchestrate multiple AI coding agents (e.g., cursor-agent, claude-code, codex-nation, open-code, cursor-background-agents, kilo-code, cline.bot, amp, roo-cline) within a single terminal-based TUI (Text User Interface). It leverages `tmux` for pane management and `git worktrees` for isolated, branch-specific workspaces. The goal is to enable seamless collaboration between agents, human users, and Git operations in a "claude-squad"-like squad model, where agents can "talk" via a central chat interface, propose changes, and execute code in parallel worktrees.

This tool transforms the fragmented IDE experience (as depicted in the provided Cursor/Claude screenshots) into a unified, terminal-native environment. Users chat with agents to brainstorm, generate code, review diffs, and manage branches—all without leaving the terminal. It's "chat-first" meaning the core interaction loop starts with natural language queries, routed to the appropriate agent(s), with visual feedback in a TUI layout.

**Key Principles**:
- **Modular Agents**: Pluggable AI backends (e.g., via APIs for Claude, OpenAI Codex, etc.).
- **Git-Native**: Uses `git worktree` for lightweight, isolated branches (no full clones).
- **Tmux Integration**: Dynamically splits panes for chat, code editors, diffs, and terminals.
- **Accessibility**: ARIA-like labels for screen readers; responsive to terminal size.
- **Offline-First**: Local caching of agent responses; syncs on demand.

**Target Users**:
- Developers using multiple AI tools for code generation/review.
- Teams in "squad" mode (e.g., one agent for planning, another for implementation).
- Terminal enthusiasts avoiding heavy IDEs like Cursor.

**Dependencies**:
- Core: Node.js (for TUI via `ink`), `tmux`, `git`.
- Agents: API keys for Claude, OpenAI, etc. (configurable via `.env`).
- No external installs in runtime; assume pre-setup.

## High-Level Architecture

### Components
1. **Chat Interface**: Central pane for user-agent conversation. Supports multi-agent threading (e.g., "Ask claude-code to review codex-nation's diff").
2. **Agent Router**: Dispatches queries to selected agents; aggregates responses.
3. **Worktree Manager**: Handles `git worktree add/remove` for branches; syncs with tmux panes.
4. **TUI Layout Engine**: Uses `tmux` to create/resizes panes (chat | code | diff | terminal).
5. **Event Bus**: Pub/sub for agent notifications (e.g., "New diff ready in worktree").

### Workflow Example
1. User runs `composer init --project my-repo`.
2. TUI launches in tmux: Chat pane prompts "What do you want to build?"
3. User types: "Update workspace sidebar colors to match theme."
4. Router selects agents (e.g., claude-code for analysis, cursor-agent for implementation).
5. Agents respond in chat; propose Git branch (`feat/transparent-sidebar`).
6. User approves: Auto-creates worktree, opens editor pane with generated code.
7. Diff pane shows changes; terminal pane runs tests.
8. Chat continues: "Merge if tests pass?" → Executes `git merge`.

### Agent Integration
| Agent Name          | Role                          | Backend API/CLI                  | TUI Icon/Label |
|---------------------|-------------------------------|----------------------------------|----------------|
| cursor-agent       | UI/UX implementation         | Cursor API (hypothetical)       | 🖱️ Cursor     |
| claude-code        | Code review & planning       | Anthropic Claude API            | 🤖 Claude     |
| codex-nation       | Code generation              | OpenAI Codex API                | 📝 Codex      |
| open-code          | Open-source snippet sourcing | GitHub API + local cache        | 🌐 Open       |
| cursor-background-agents | Async tasks (linting/tests) | Cursor background hooks         | ⏳ Background |
| kilo-code          | Performance optimization     | Custom (e.g., Rust-based)       | ⚡ Kilo       |
| cline.bot          | Command-line scripting       | CLI wrapper for agents          | ⌨️ Cline      |
| amp                | Amplification (scale tasks)  | Parallel execution wrapper      | 🔄 Amp        |
| roo-cline          | Root-level ops (e.g., deps)  | Roo CLI integration             | 🌳 Roo        |

Agents are configured in `~/.composer/agents.json`. Squad mode (claude-squad) chains them: e.g., claude-code → codex-nation → cursor-agent.

## Detailed TUI Design

The TUI mimics the provided Cursor/Claude screenshots: A split-pane layout with sidebar (branches/worktrees), central chat/thinking area, file tree, code editor, diff viewer, and terminal. It's built with `tmux` panes for true multi-session support, but rendered via a Node.js TUI library (e.g., `ink` for React-like components in terminal).

### Layout Structure
- **Overall**: Horizontal split (left: Sidebar + Chat | right: Files + Editor + Diff + Terminal).
- **Responsive**: Adapts to terminal width (>120 cols preferred); stacks vertically on small screens.
- **Colors**: Dark theme (bg: #0d1117, fg: #f0f6fc, accents: #58a6ff for links/branches).
- **Keybindings**:
  - `Ctrl+C`: Chat input.
  - `Ctrl+B`: Switch branch/worktree.
  - `Ctrl+D`: Toggle diff.
  - `Ctrl+T`: New terminal pane.
  - `Esc`: Back to chat.

### ASCII Art Depiction of Target UI
Below is a code-based (ASCII art) representation of the TUI in a 120x40 terminal window. This depicts a session mid-workflow: User querying about sidebar colors, agents responding, a new branch created, code generated in editor, diff shown, and terminal running tests. It's detailed for AI/users to visualize—imagine this rendered live with colors and interactivity.

```ascii
┌──────────────────────────────────────────────────────────────────────────────────────────────┐  <- tmux status bar (session: composer-my-repo | agents: claude,codex | worktrees: 3)
│ [Home] conductor (main) ● update-workspace-sidebar (+11-1) │ New messages: 2 │ Branch: feat/transparent-sidebar │                                                                 │
│                                                                                              │  <- Left Sidebar: Branches/Worktrees (git worktree list, clickable)
│ ├─── Branches:                                                                              │
│ │   ○ main (conductor/worcester - 2m ago)                                                   │
│ │   ● feat/transparent-sidebar (+11-1 | New messages: 2m ago)                               │
│ │   ○ hover-dashboard-subtitle (-2-401)                                                     │
│ │   └─── + New worktree (chorus-icon-changes | push-branch-remote)                          │
│ │                                                                                           │
│ ├─── Workspaces:                                                                            │
│ │   ○ conductor/montpelier (2m ago)                                                         │
│ │   └─── + New workspace                                                                    │
│ │                                                                                           │
│ └─── PRs: #1337 (open - 2m ago)                                                             │
│                                                                                              │
├──────────────────────────────────────────────────────────────────────────────────────────────┤  <- Horizontal split: Left (30%) | Right (70%)
│ Thinking... The user is asking to think about how I would change...                          │  │ Files (tree view) │ Editor (code) │ Diff │ Terminal                  │  <- Central Chat Pane (top-left, 50% height)
│ I'll help you implement a transparent sidebar. First, let me rename the                     │  │                   │                │      │                           │
│ branch as requested, then analyze the current UI implementation.                            │  │ 📁 src/           │ import {      │ +44- │ vite build                 │
│                                                                                              │  │ ├─ components/    │   WorkspaceS...│ 401  │ > dist/ (built)            │
│ > Rename branch to feat/transparent-sidebar                                                 │  │ │ ├─ WorkspaceS...│   } from './.. │      │ Tests: 17 passed, 0 failed │
│   git branch -m update-workspace-sidebar feat/transparent-sidebar                           │  │ │ │ .tsx (+44-401) │   .ts'                                 │
│   git worktree add ../transparent-wt feat/transparent-sidebar                              │  │ │ ├─ TextEditor...│ export const  │      │ Logs: vite.log             │
│                                                                                              │  │ │ │ .tsx (+44-401) │   ButtonProps │      │ > npm test --watch         │
│ Q: grep 'WorkspaceSidebar' (3 matches)                                                       │  │ │ └─ useArchive... │   = {children │      │                           │
│   ┌─ Read 1849 lines components/WorkspaceSidebar.tsx ┐                                      │  │ │   .ts (-9)      │   , onClick}  │      │ ┌─────────────────────────┐│
│   └─ Read 58 lines src/App.css ┘                                      │  │ └─ utils/        │   as: 'button'│      │ │ claude-code: Reviewing..││
│                                                                                              │  │     └─ ...       │   size?: 'smal │      │ │ codex-nation: Gen code.. ││
│ Now understand the current UI implementation. It's using colors derived                     │  │                   │   l'\|'medium' │      │ │ > Approve merge? (y/n)   ││
│ from color tokens. I'll move the blend mode classes to the outer div.                        │  │ Open:             │   \|'large';   │      │ └─────────────────────────┘│
│ 1. import {WorkspaceSidebar} from './...';                                                  │  │ ├─ src/App.css   │   };           │      │                           │
│ 2. const {ButtonProps} from './types';                                                       │  │ └─ ...            │                │      │                           │
│ 3. export const Button: React.FC<ButtonProps> = ({children, onClick}) => {                  │  │                   │ return (       │      │                           │
│ 4.   - return( <button onClick={onClick}> {children} </button> );                            │  │                   │   <button      │      │                           │
│ 5.   + interface ExtendedButtonProps extends ButtonProps {                                  │  │                   │   className=   │      │                           │
│ 6.     size?: 'small' \| 'medium' \| 'large';                                               │  │                   │   "bg-blend-   │      │                           │
│ 7.   };                                                                                     │  │                   │   multiply     │      │                           │
│ 8.   + };                                                                                   │  │                   │   text-white   │      │                           │
│                                                                                              │  │                   │   p-2">        │      │                           │
│ Ask Claude anything... [Input: _______________] * Opus + Add thinking +                      │  │                   │   {children}   │      │                           │
│                                                                                              │  │                   │   </button>    │      │                           │
│ ┌─ Agent Squad: claude-code (planning) | codex-nation (gen) | cursor-agent (impl) ─┐         │  │                   │ );             │      │                           │
│ │ New msg: claude-code: "To match theme, derive from CSS vars --sidebar-bg: rgba(0,0,0,0.5)" │  │                   │ }              │      │                           │
│ │ New msg: codex-nation: "Generated TSX: Updated blend-mode to 'multiply' for transparency"  │  │                   │                │      │                           │
│ └───────────────────────────────────────────────────────────────────────────────────────────┘ │  │                   │ ┌──────────────┐│      │                           │
│                                                                                              │  │                   │ │ Diff: +blend- ││      │                           │  <- Chat History (bottom-left, scrollable)
└──────────────────────────────────────────────────────────────────────────────────────────────┘  │  │                   │ │ mode class    ││      │                           │
                                                                                               │  │                   │ │ to outer div  ││      │                           │
                                                                                               │  │                   │ └──────────────┘│      │                           │  <- Status Bar: Progress (28% | Review Changes | @Agent AI | ©-supernova)
```

**UI Element Breakdown** (for AI/users):
- **Left Sidebar (10% width)**: Tree view of branches/PRs/workspaces. Icons: ● active, ○ inactive, + new. Click (mouse) or `j/k` to navigate; `Enter` to switch worktree (syncs tmux pane).
- **Chat Pane (20% width, full height)**: Top: Thinking bubble (agent reasoning). Middle: Query/response thread (markdown-rendered). Bottom: Input bar + agent selector dropdown. Supports threading (e.g., reply to specific agent).
- **File Tree (10% width, right-top)**: `ls`-like tree; highlights changed files (+/- lines). Integrates `grep` for quick search.
- **Editor Pane (30% width, right-middle)**: Syntax-highlighted code view (via `bat` or `helix` integration). Auto-loads focused file; supports vim-like editing.
- **Diff Pane (10% width, right-middle)**: Inline diff viewer (`git diff --color`). Toggles hunks; ARIA labels: "Added line 44: blend-mode: multiply".
- **Terminal Pane (20% width, right-bottom)**: Embedded shell (tmux sub-pane). Runs agent commands (e.g., `npm test`, `git push`). Multi-line output with scroll.
- **Dynamic Elements**: 
  - Notifications: Popover bubbles (e.g., "New diff ready").
  - Progress: Footer bar shows build/test status (e.g., 28% via spinner).
  - Squad View: Mini-panel listing active agents with status (idle | thinking | done).

## Implementation Roadmap

### Phase 1: Core TUI 
- Setup `tmux` session with panes via `commander.js`.
- Basic chat: `readline` input → mock agent responses.
- Git worktree CRUD: `simple-git` wrapper.

### Phase 2: Agent Integration
- Router: LLM prompt to select/route (e.g., "Query: Update sidebar → claude-code").
- APIs: Axios wrappers for each agent; fallback to local mocks.
- Squad Mode: Chain responses (output of one → input of next).

### Phase 3: Polish & Features 
- Responsive layout: Detect terminal size via `process.stdout`.
- Accessibility: Add `speak` for voice output (optional).
- Extensibility: Plugin system for new agents.

### Potential Challenges & Questions
- **Agent Auth**: How to handle API keys securely? (Propose: Vault integration.)
- **Concurrency**: tmux pane sync for parallel agents? (Use named sessions.)
- **Error Handling**: What if an agent times out? (Chat fallback: "Claude offline—try codex?")
- **Testing**: Unit tests for router; e2e via `playwright` in terminal?

If you have questions or want to iterate (e.g., add a specific agent flow), reply—let's chat! 🚀
