import * as fs from "node:fs/promises";
import { homedir } from "node:os";
import * as path from "node:path";
import * as Effect from "effect/Effect";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface OpencodeSession {
  id: string;
  agent: "opencode";
  timestamp: Date;
  cwd?: string;
  repository?: string;
  branch?: string;
  summary?: string;
  status: "active" | "completed" | "failed";
}

interface OpencodeSessionFile {
  id: string;
  version: string;
  projectID: string;
  directory: string;
  title?: string;
  time: {
    created: number;
    updated: number;
  };
}

interface OpencodeProjectFile {
  id: string;
  worktree: string;
  vcs?: string;
  time: {
    created: number;
  };
}

// -----------------------------------------------------------------------------
// Opencode Session Parser
// -----------------------------------------------------------------------------

// Get XDG data directory for opencode
const getOpencodeDataDir = (): string => {
  const xdgData =
    process.env.XDG_DATA_HOME || path.join(homedir(), ".local", "share");
  return path.join(xdgData, "opencode");
};

export const parseOpencodeSessions = (): Effect.Effect<
  OpencodeSession[],
  Error
> =>
  Effect.gen(function* () {
    const opencodeDir = getOpencodeDataDir();
    const storageDir = path.join(opencodeDir, "storage");
    const sessionDir = path.join(storageDir, "session");
    const projectDir = path.join(storageDir, "project");

    // Check if session directory exists
    const sessionDirExists = yield* Effect.tryPromise({
      try: () => fs.access(sessionDir).then(() => true),
      catch: () => false,
    }).pipe(Effect.orElse(() => Effect.succeed(false)));

    if (!sessionDirExists) {
      return [];
    }

    // Read all project metadata to map projectID to repository info
    const projectMap = new Map<string, OpencodeProjectFile>();
    const projectDirExists = yield* Effect.tryPromise({
      try: () => fs.access(projectDir).then(() => true),
      catch: () => false,
    }).pipe(Effect.orElse(() => Effect.succeed(false)));

    if (projectDirExists) {
      const projectFiles = yield* Effect.tryPromise({
        try: () => fs.readdir(projectDir, { withFileTypes: true }),
        catch: () => [],
      }).pipe(Effect.orElse(() => Effect.succeed([])));

      for (const file of projectFiles) {
        if (!file.isFile() || !file.name.endsWith(".json")) continue;

        const projectData = yield* Effect.tryPromise({
          try: async () => {
            const content = await fs.readFile(path.join(projectDir, file.name), "utf-8");
            return JSON.parse(content) as OpencodeProjectFile;
          },
          catch: () => null,
        }).pipe(Effect.orElse(() => Effect.succeed(null)));

        if (projectData?.id) {
          projectMap.set(projectData.id, projectData);
        }
      }
    }

    // List all project directories in session directory
    const projectDirs = yield* Effect.tryPromise({
      try: () => fs.readdir(sessionDir, { withFileTypes: true }),
      catch: (error) =>
        new Error(
          `Failed to read session directory: ${error instanceof Error ? error.message : String(error)}`,
        ),
    }).pipe(Effect.orElse(() => Effect.succeed([])));

    const sessions: OpencodeSession[] = [];

    // Iterate through each project directory
    for (const projectDirEntry of projectDirs) {
      if (!projectDirEntry.isDirectory()) continue;

      const projectSessionDir = path.join(sessionDir, projectDirEntry.name);

      // Read all session files in this project directory
      const sessionFiles = yield* Effect.tryPromise({
        try: () => fs.readdir(projectSessionDir, { withFileTypes: true }),
        catch: () => [],
      }).pipe(Effect.orElse(() => Effect.succeed([])));

      for (const sessionFile of sessionFiles) {
        if (!sessionFile.isFile() || !sessionFile.name.endsWith(".json")) continue;

        const sessionFilePath = path.join(projectSessionDir, sessionFile.name);
        const sessionData = yield* Effect.tryPromise({
          try: async () => {
            const content = await fs.readFile(sessionFilePath, "utf-8");
            return JSON.parse(content) as OpencodeSessionFile;
          },
          catch: () => null,
        }).pipe(Effect.orElse(() => Effect.succeed(null)));

        if (!sessionData) continue;

        // Get project metadata for this session
        const projectMeta = projectMap.get(sessionData.projectID);

        sessions.push({
          id: sessionData.id,
          agent: "opencode",
          timestamp: new Date(sessionData.time.created),
          cwd: sessionData.directory,
          repository: projectMeta?.worktree || sessionData.directory,
          branch: undefined, // Opencode doesn't store branch in session files
          summary: sessionData.title,
          status: "completed", // If it exists, it's been created
        });
      }
    }

    return sessions.sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
    );
  });
