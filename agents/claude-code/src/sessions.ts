import * as fs from "node:fs/promises";
import { homedir } from "node:os";
import * as path from "node:path";
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

interface SessionMetadata {
  id?: string;
  timestamp?: number;
  cwd?: string;
  repository?: string;
  branch?: string;
  messageCount?: number;
  [key: string]: unknown;
}

// -----------------------------------------------------------------------------
// Claude Code Session Parser
// -----------------------------------------------------------------------------

// Note: Claude Code stores sessions in binary format (LevelDB/IndexedDB)
// Location: ~/Library/Application Support/Claude/Session Storage/ (macOS)
//           ~/.config/Claude/Session Storage/ (Linux)
//
// The session data is stored in LevelDB format (.ldb files) which requires
// special parsing libraries to read.
//
// For testing purposes, we also support reading from a JSON cache file
// at ~/.claude-code/sessions.json if it exists

export const parseClaudeCodeSessions = (): Effect.Effect<
  ClaudeCodeSession[],
  Error
> =>
  Effect.gen(function* () {
    // Try to read from cache file first (for testing)
    const cacheDir = path.join(homedir(), ".claude-code");
    const cacheFile = path.join(cacheDir, "sessions.json");

    const cacheExists = yield* Effect.tryPromise({
      try: () => fs.access(cacheFile).then(() => true),
      catch: () => false,
    }).pipe(Effect.orElse(() => Effect.succeed(false)));

    if (cacheExists) {
      const sessionData = yield* Effect.tryPromise({
        try: async () => {
          const content = await fs.readFile(cacheFile, "utf-8");
          return JSON.parse(content) as SessionMetadata[];
        },
        catch: (error) =>
          new Error(
            `Failed to read sessions cache: ${error instanceof Error ? error.message : String(error)}`,
          ),
      }).pipe(Effect.orElse(() => Effect.succeed([])));

      const sessions: ClaudeCodeSession[] = sessionData.map((meta) => ({
        id: meta.id || `claude-code-${Date.now()}`,
        agent: "claude-code" as const,
        timestamp: new Date(meta.timestamp || Date.now()),
        cwd: meta.cwd,
        repository: meta.repository,
        branch: meta.branch,
        summary: meta.messageCount
          ? `Claude Code session: ${meta.messageCount} messages`
          : "Claude Code session",
        status: (meta.messageCount || 0) > 0 ? "completed" : "active",
      }));

      return sessions.sort(
        (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
      );
    }

    // TODO: Implement LevelDB parsing for production use
    // - Add level-js or similar library to parse LevelDB
    // - Extract session data from IndexedDB
    // - Parse conversation history and metadata
    return [];
  });
