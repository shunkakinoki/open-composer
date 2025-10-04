// -----------------------------------------------------------------------------
// Common Types
// -----------------------------------------------------------------------------

export interface AISession {
  id: string;
  agent:
    | "codex"
    | "opencode"
    | "cursor"
    | "cursor-agent"
    | "claude-code"
    | "unknown";
  timestamp: Date;
  cwd?: string;
  repository?: string;
  branch?: string;
  summary?: string;
  status: "active" | "completed" | "failed";
}

// -----------------------------------------------------------------------------
// Codex Types
// -----------------------------------------------------------------------------

export interface CodexSessionMeta {
  id: string;
  timestamp: string;
  cwd: string;
  originator: string;
  cli_version: string;
  instructions: string | null;
  git?: {
    commit_hash: string;
    branch: string;
    repository_url: string;
  };
}

export interface CodexSessionEntry {
  timestamp: string;
  type: string;
  payload: unknown;
}

// -----------------------------------------------------------------------------
// Cursor Types
// -----------------------------------------------------------------------------

export interface CursorWorktree {
  path: string;
  timestamp: number;
  id: string;
}

// -----------------------------------------------------------------------------
// Claude Code Types
// -----------------------------------------------------------------------------

export interface ClaudeCodeSession {
  id: string;
  timestamp: string;
  workspace?: string;
  context?: string;
}
