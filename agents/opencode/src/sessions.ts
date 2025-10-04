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

export const parseCursorSessions = (): Effect.Effect<CursorSession[], Error> =>
  Effect.gen(function* () {
    const cursorDir = path.join(homedir(), ".cursor", "worktrees");

    // Check if directory exists
    const dirExists = yield* Effect.tryPromise({
      try: () => fs.access(cursorDir).then(() => true),
      catch: () => false,
    }).pipe(Effect.orElse(() => Effect.succeed(false)));

    if (!dirExists) {
      return [];
    }

    // List all project directories
    const projectDirs = yield* Effect.tryPromise({
      try: () => fs.readdir(cursorDir, { withFileTypes: true }),
      catch: (error) =>
        new Error(
          `Failed to read cursor directory: ${error instanceof Error ? error.message : String(error)}`,
        ),
    }).pipe(Effect.orElse(() => Effect.succeed([])));

    const sessions: CursorSession[] = [];

    for (const projectDir of projectDirs) {
      if (!projectDir.isDirectory()) continue;

      const projectPath = path.join(cursorDir, projectDir.name);
      const worktrees = yield* Effect.tryPromise({
        try: () => fs.readdir(projectPath, { withFileTypes: true }),
        catch: () => new Error("Failed to read worktrees"),
      }).pipe(Effect.orElse(() => Effect.succeed([])));

      for (const worktree of worktrees) {
        if (!worktree.isDirectory()) continue;

        // Parse timestamp from directory name (e.g., 1759450333833-182a9d)
        const parts = worktree.name.split("-");
        const timestamp = parts[0] ? Number.parseInt(parts[0], 10) : Date.now();

        // Try to get git info from the worktree
        const worktreePath = path.join(projectPath, worktree.name);
        const gitHeadPath = path.join(worktreePath, ".git", "HEAD");
        const branch = yield* Effect.tryPromise({
          try: async () => {
            const headContent = await fs.readFile(gitHeadPath, "utf-8");
            const branchMatch = headContent.match(/ref: refs\/heads\/(.+)/);
            return branchMatch?.[1];
          },
          catch: () => new Error("Failed to read git HEAD"),
        }).pipe(Effect.orElse(() => Effect.succeed(undefined)));

        sessions.push({
          id: `cursor-${projectDir.name}-${worktree.name}`,
          agent: "cursor-agent",
          timestamp: new Date(timestamp),
          cwd: worktreePath,
          repository: projectDir.name.replace(/-/g, "/"),
          branch,
          summary: `Cursor worktree: ${projectDir.name}`,
          status: "active",
        });
      }
    }

    return sessions;
  });
