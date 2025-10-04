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

interface SessionInfo {
  id?: string;
  timestamp?: number;
  cwd?: string;
  repository?: string;
  branch?: string;
  [key: string]: unknown;
}

interface SessionMessage {
  role?: string;
  content?: string;
  timestamp?: number;
  [key: string]: unknown;
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

    // Check if directory exists
    const dirExists = yield* Effect.tryPromise({
      try: () => fs.access(opencodeDir).then(() => true),
      catch: () => false,
    }).pipe(Effect.orElse(() => Effect.succeed(false)));

    if (!dirExists) {
      return [];
    }

    // List all files in the opencode data directory
    const files = yield* Effect.tryPromise({
      try: () => fs.readdir(opencodeDir, { withFileTypes: true }),
      catch: (error) =>
        new Error(
          `Failed to read opencode directory: ${error instanceof Error ? error.message : String(error)}`,
        ),
    }).pipe(Effect.orElse(() => Effect.succeed([])));

    const sessions: OpencodeSession[] = [];

    // Look for session JSON files
    for (const file of files) {
      if (!file.isFile()) continue;
      if (!file.name.endsWith(".json")) continue;

      const filePath = path.join(opencodeDir, file.name);
      const sessionData = yield* Effect.tryPromise({
        try: async () => {
          const content = await fs.readFile(filePath, "utf-8");
          return JSON.parse(content);
        },
        catch: () => new Error(`Failed to read session file: ${file.name}`),
      }).pipe(Effect.orElse(() => Effect.succeed(null)));

      if (!sessionData) continue;

      // Try to extract session info and messages
      const info = sessionData.info as SessionInfo | undefined;
      const messages =
        (sessionData.messages as SessionMessage[] | undefined) || [];

      // Extract summary from first user message
      const firstUserMessage = messages.find((msg) => msg.role === "user");
      const summary = firstUserMessage?.content
        ? firstUserMessage.content.substring(0, 100)
        : undefined;

      // Determine status (if session has messages, it's active or completed)
      const status: "active" | "completed" | "failed" =
        messages.length > 0 ? "completed" : "active";

      sessions.push({
        id: info?.id || file.name.replace(".json", ""),
        agent: "opencode",
        timestamp: new Date(info?.timestamp || 0),
        cwd: info?.cwd,
        repository: info?.repository,
        branch: info?.branch,
        summary,
        status,
      });
    }

    return sessions.sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
    );
  });
