import { Database } from "bun:sqlite";
import * as fs from "node:fs/promises";
import { homedir } from "node:os";
import * as path from "node:path";
import * as Effect from "effect/Effect";
import type { CursorMessage } from "./parser.js";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface CursorSession {
  id: string;
  agent: "cursor" | "cursor-agent";
  timestamp: Date;
  cwd?: string;
  repository?: string;
  branch?: string;
  summary?: string;
  status: "active" | "completed" | "failed";
}

// -----------------------------------------------------------------------------
// Cursor Session Parser
// -----------------------------------------------------------------------------

// Cursor stores AI chat sessions in SQLite databases
// Location: ~/.cursor/chats/{workspace-hash}/{session-id}/store.db
// The session data is stored in SQLite with binary blobs

export const parseCursorSessions = (): Effect.Effect<CursorSession[], Error> =>
  Effect.gen(function* () {
    const sessions: CursorSession[] = [];

    // Parse Cursor Chat sessions from ~/.cursor/chats
    const chatSessions = yield* parseCursorChatSessions();
    sessions.push(...chatSessions);

    // Parse Cursor Composer sessions from ~/.cursor/worktrees
    const composerSessions = yield* parseCursorComposerSessions();
    sessions.push(...composerSessions);

    return sessions.sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
    );
  });

// Parse traditional Cursor Chat sessions
const parseCursorChatSessions = (): Effect.Effect<CursorSession[], Error> =>
  Effect.gen(function* () {
    const chatsDir = path.join(homedir(), ".cursor", "chats");

    // Check if directory exists
    const dirExists = yield* Effect.tryPromise({
      try: () => fs.access(chatsDir).then(() => true),
      catch: () => false,
    }).pipe(Effect.orElse(() => Effect.succeed(false)));

    if (!dirExists) {
      return [];
    }

    const sessions: CursorSession[] = [];

    // List all workspace directories
    const workspaceDirs = yield* Effect.tryPromise({
      try: () => fs.readdir(chatsDir, { withFileTypes: true }),
      catch: (error) =>
        new Error(
          `Failed to read chats directory: ${error instanceof Error ? error.message : String(error)}`,
        ),
    }).pipe(Effect.orElse(() => Effect.succeed([])));

    for (const workspaceDir of workspaceDirs) {
      if (!workspaceDir.isDirectory()) continue;

      const workspacePath = path.join(chatsDir, workspaceDir.name);

      // List all session directories within this workspace
      const sessionDirs = yield* Effect.tryPromise({
        try: () => fs.readdir(workspacePath, { withFileTypes: true }),
        catch: () => new Error("Failed to read workspace sessions"),
      }).pipe(Effect.orElse(() => Effect.succeed([])));

      for (const sessionDir of sessionDirs) {
        if (!sessionDir.isDirectory()) continue;

        const dbPath = path.join(workspacePath, sessionDir.name, "store.db");

        // Check if store.db exists
        const dbExists = yield* Effect.tryPromise({
          try: () => fs.access(dbPath).then(() => true),
          catch: () => false,
        }).pipe(Effect.orElse(() => Effect.succeed(false)));

        if (!dbExists) continue;

        // Parse the SQLite database
        const sessionData = yield* Effect.tryPromise({
          try: async () => {
            const db = new Database(dbPath, { readonly: true });

            try {
              // Get metadata from meta table
              const metaRows = db
                .query("SELECT key, value FROM meta")
                .all() as Array<{
                key: string;
                value: string;
              }>;

              let parsedMeta: any = {};
              for (const row of metaRows) {
                try {
                  // The value is stored as hex-encoded JSON
                  const hexString = row.value;
                  const jsonString = Buffer.from(hexString, 'hex').toString('utf-8');
                  parsedMeta = JSON.parse(jsonString);
                } catch {
                  // If parsing fails, skip
                }
              }

              // Count blobs as a proxy for messages
              const blobCount = db
                .query("SELECT COUNT(*) as count FROM blobs")
                .get() as {
                count: number;
              } | null;

              return {
                meta: parsedMeta,
                messageCount: blobCount?.count || 0,
              };
            } finally {
              db.close();
            }
          },
          catch: (error) =>
            new Error(
              `Failed to read SQLite DB: ${error instanceof Error ? error.message : String(error)}`,
            ),
        }).pipe(Effect.orElse(() => Effect.succeed(null)));

        if (!sessionData) continue;

        // Get timestamp from meta.createdAt or fall back to file modification time
        let timestamp = new Date();
        if (sessionData.meta?.createdAt) {
          timestamp = new Date(sessionData.meta.createdAt);
        } else {
          const dbStats = yield* Effect.tryPromise({
            try: () => fs.stat(dbPath),
            catch: () => new Error("Failed to get file stats"),
          }).pipe(Effect.orElse(() => Effect.succeed(null)));
          if (dbStats?.mtime) {
            timestamp = dbStats.mtime;
          }
        }

        // Determine status based on message count
        const status: "active" | "completed" | "failed" =
          sessionData.messageCount > 0 ? "completed" : "active";

        // Use name from meta if available
        const sessionName = sessionData.meta?.name || `Session ${sessionDir.name.slice(0, 8)}`;

        sessions.push({
          id: `cursor-${workspaceDir.name}-${sessionDir.name}`,
          agent: "cursor-agent",
          timestamp,
          cwd: workspacePath,
          summary: `${sessionName} (${sessionData.messageCount} messages)`,
          status,
        });
      }
    }

    return sessions;
  });

// Parse Cursor Composer sessions from worktrees
const parseCursorComposerSessions = (): Effect.Effect<CursorSession[], Error> =>
  Effect.gen(function* () {
    const worktreesDir = path.join(homedir(), ".cursor", "worktrees");

    // Check if directory exists
    const dirExists = yield* Effect.tryPromise({
      try: () => fs.access(worktreesDir).then(() => true),
      catch: () => false,
    }).pipe(Effect.orElse(() => Effect.succeed(false)));

    if (!dirExists) {
      return [];
    }

    const sessions: CursorSession[] = [];

    // List all project directories (e.g., "open-composer", "cursor-agents-test")
    const projectDirs = yield* Effect.tryPromise({
      try: () => fs.readdir(worktreesDir, { withFileTypes: true }),
      catch: (error) =>
        new Error(
          `Failed to read worktrees directory: ${error instanceof Error ? error.message : String(error)}`,
        ),
    }).pipe(Effect.orElse(() => Effect.succeed([])));

    for (const projectDir of projectDirs) {
      if (!projectDir.isDirectory()) continue;

      const projectPath = path.join(worktreesDir, projectDir.name);

      // List all worktree directories within this project
      const worktreeDirs = yield* Effect.tryPromise({
        try: () => fs.readdir(projectPath, { withFileTypes: true }),
        catch: () => new Error("Failed to read project worktrees"),
      }).pipe(Effect.orElse(() => Effect.succeed([])));

      for (const worktreeDir of worktreeDirs) {
        if (!worktreeDir.isDirectory()) continue;

        const worktreePath = path.join(projectPath, worktreeDir.name);

        // Get directory stats for timestamp
        const dirStats = yield* Effect.tryPromise({
          try: () => fs.stat(worktreePath),
          catch: () => new Error("Failed to get directory stats"),
        }).pipe(Effect.orElse(() => Effect.succeed(null)));

        // Try to extract timestamp from directory name (format: timestamp-hash)
        let timestamp = new Date();
        const timestampMatch = worktreeDir.name.match(/^(\d+)-/);
        if (timestampMatch) {
          timestamp = new Date(Number.parseInt(timestampMatch[1]));
        } else if (dirStats?.mtime) {
          timestamp = dirStats.mtime;
        }

        // Cursor Composer worktrees may or may not have .git (some get cleaned up)
        // We'll trust the directory structure since it's in ~/.cursor/worktrees

        // Extract repository name from project directory
        const repository = projectDir.name;

        // All Cursor Composer worktrees are considered completed
        const status: "active" | "completed" | "failed" = "completed";

        sessions.push({
          id: `cursor-composer-${projectDir.name}-${worktreeDir.name}`,
          agent: "cursor-agent",
          timestamp,
          repository,
          cwd: worktreePath,
          summary: `Cursor Composer session`,
          status,
        });
      }
    }

    return sessions;
  });

// -----------------------------------------------------------------------------
// Message Reading
// -----------------------------------------------------------------------------

/**
 * Read messages from a Cursor session
 */
export const readCursorSessionMessages = (
  sessionId: string,
): Effect.Effect<CursorMessage[], Error> =>
  Effect.gen(function* () {
    if (sessionId.startsWith("cursor-composer-")) {
      // Cursor Composer sessions dont have accessible message history
      return [];
    }

    if (!sessionId.startsWith("cursor-")) {
      throw new Error(`Invalid Cursor session ID format: ${sessionId}`);
    }

    // Remove "cursor-" prefix to get workspace-session combination
    const workspaceAndSession = sessionId.slice(7); // Remove "cursor-"

    // Since workspace and session names can contain dashes, we need to search
    // for the database file by trying different split points
    const chatsDir = path.join(homedir(), ".cursor", "chats");

    const chatsDirExists = yield* Effect.tryPromise({
      try: () => fs.access(chatsDir).then(() => true),
      catch: () => false,
    }).pipe(Effect.orElse(() => Effect.succeed(false)));

    if (!chatsDirExists) {
      return [];
    }

    // List all workspace directories
    const workspaceDirs = yield* Effect.tryPromise({
      try: () => fs.readdir(chatsDir, { withFileTypes: true }),
      catch: () => [],
    }).pipe(Effect.orElse(() => Effect.succeed([])));

    // Try to find the matching workspace and session
    for (const workspaceDir of workspaceDirs) {
      if (!workspaceDir.isDirectory()) continue;

      // Check if the workspace-session string starts with this workspace name
      if (workspaceAndSession.startsWith(workspaceDir.name + "-")) {
        const sessionName = workspaceAndSession.slice(workspaceDir.name.length + 1);
        const dbPath = path.join(chatsDir, workspaceDir.name, sessionName, "store.db");

        const dbExists = yield* Effect.tryPromise({
          try: () => fs.access(dbPath).then(() => true),
          catch: () => false,
        }).pipe(Effect.orElse(() => Effect.succeed(false)));

        if (dbExists) {
          const messages = yield* Effect.tryPromise({
            try: async () => {
              const db = new Database(dbPath, { readonly: true });
              try {
                const blobCount = db
                  .query("SELECT COUNT(*) as count FROM blobs")
                  .get() as { count: number } | null;

                if (!blobCount || blobCount.count === 0) {
                  return [];
                }

                return [
                  {
                    role: "system" as const,
                    content: `Cursor session with ${blobCount.count} messages. Full parsing not yet implemented.`,
                    createdAt: Date.now(),
                  },
                ];
              } finally {
                db.close();
              }
            },
            catch: (error) =>
              new Error(`Failed to read Cursor messages: ${error instanceof Error ? error.message : String(error)}`),
          });

          return messages;
        }
      }
    }

    return [];
  });

