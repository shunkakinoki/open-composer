import * as Effect from "effect/Effect";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface ClaudeCodeSession {
  id: string;
  agent: "claude-code";
  timestamp: Date;
  cwd?: string;
  repository?: string;
  branch?: string;
  summary?: string;
  status: "active" | "completed" | "failed";
}

// -----------------------------------------------------------------------------
// Claude Code Session Parser
// -----------------------------------------------------------------------------

// Note: Claude Code session storage location is not yet known
// This is a placeholder implementation that can be updated once the location is discovered

export const parseClaudeCodeSessions = (): Effect.Effect<
  ClaudeCodeSession[],
  Error
> =>
  // TODO: Implement Claude Code session parsing once storage location is known
  // Possible locations to check:
  // - ~/Library/Application Support/claude-code
  // - ~/Library/Application Support/Claude/Code
  // - ~/.claude-code
  // - ~/.config/claude-code
  Effect.succeed([]);
