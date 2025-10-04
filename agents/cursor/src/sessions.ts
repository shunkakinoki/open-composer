import { Database } from "bun:sqlite";
import * as fs from "node:fs/promises";
import { homedir } from "node:os";
import * as path from "node:path";
import * as Effect from "effect/Effect";

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

              const meta: Record<string, string> = {};
              for (const row of metaRows) {
                meta[row.key] = row.value;
              }

              // Count blobs as a proxy for messages
              const blobCount = db
                .query("SELECT COUNT(*) as count FROM blobs")
                .get() as {
                count: number;
              } | null;

              return {
                meta,
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

        // Extract timestamp from session directory name if it's a UUID
        const timestamp = new Date();

        // Determine status based on message count
        const status: "active" | "completed" | "failed" =
          sessionData.messageCount > 0 ? "completed" : "active";

        sessions.push({
          id: `cursor-${workspaceDir.name}-${sessionDir.name}`,
          agent: "cursor-agent",
          timestamp,
          cwd: workspacePath,
          summary: `Cursor chat: ${sessionData.messageCount} messages`,
          status,
        });
      }
    }

    return sessions.sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
    );
  });
