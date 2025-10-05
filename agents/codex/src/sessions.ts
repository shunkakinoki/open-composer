import * as fs from "node:fs/promises";
import { homedir } from "node:os";
import * as path from "node:path";
import * as Effect from "effect/Effect";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface CodexSession {
  id: string;
  agent: "codex";
  timestamp: Date;
  cwd?: string;
  repository?: string;
  branch?: string;
  summary?: string;
  status: "active" | "completed" | "failed";
}

interface CodexSessionMeta {
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

interface CodexSessionEntry {
  timestamp: string;
  type: string;
  payload: unknown;
}

// -----------------------------------------------------------------------------
// Codex Session Parser
// -----------------------------------------------------------------------------

export const parseCodexSessions = (): Effect.Effect<CodexSession[], Error> =>
  Effect.gen(function* () {
    const codexDir = path.join(homedir(), ".codex", "sessions");

    try {
      // Check if directory exists
      yield* Effect.tryPromise({
        try: () => fs.access(codexDir),
        catch: () => new Error("Codex sessions directory not found"),
      });

      // Find all session files recursively
      const sessionFiles = yield* findSessionFiles(codexDir);

      // Parse each session file
      const sessions: CodexSession[] = [];
      for (const file of sessionFiles) {
        const session = yield* parseCodexSessionFile(file);
        if (session) {
          sessions.push(session);
        }
      }

      return sessions;
    } catch {
      return [];
    }
  });

const findSessionFiles = (dir: string): Effect.Effect<string[], Error> =>
  Effect.gen(function* () {
    const files: string[] = [];

    const walk = async (currentDir: string): Promise<void> => {
      const entries = await fs.readdir(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        if (entry.isDirectory()) {
          await walk(fullPath);
        } else if (entry.isFile() && entry.name.endsWith(".jsonl")) {
          files.push(fullPath);
        }
      }
    };

    yield* Effect.tryPromise({
      try: () => walk(dir),
      catch: (error) =>
        new Error(
          `Failed to walk directory: ${error instanceof Error ? error.message : String(error)}`,
        ),
    });

    return files;
  });

const parseCodexSessionFile = (
  filePath: string,
): Effect.Effect<CodexSession | null, Error> =>
  Effect.gen(function* () {
    const content = yield* Effect.tryPromise({
      try: () => fs.readFile(filePath, "utf-8"),
      catch: (error) =>
        new Error(
          `Failed to read session file: ${error instanceof Error ? error.message : String(error)}`,
        ),
    });

    const lines = content.trim().split("\n");
    if (lines.length === 0) {
      return null;
    }

    // Parse first line to get session metadata
    const firstLine = JSON.parse(lines[0]) as CodexSessionEntry;
    if (firstLine.type !== "session_meta") {
      return null;
    }

    const meta = firstLine.payload as CodexSessionMeta;

    // Determine session status
    let status: CodexSession["status"] = "completed";
    for (const line of lines) {
      const entry = JSON.parse(line) as CodexSessionEntry;
      if (entry.type === "error") {
        status = "failed";
        break;
      }
    }

    // Extract summary from user messages if available
    let summary: string | undefined;
    for (const line of lines) {
      const entry = JSON.parse(line) as CodexSessionEntry;
      if (entry.type === "event_msg" && typeof entry.payload === "object") {
        const payload = entry.payload as { message?: string };
        if (payload.message) {
          summary = payload.message.slice(0, 100);
          break;
        }
      }
    }

    return {
      id: meta.id,
      agent: "codex",
      timestamp: new Date(meta.timestamp),
      cwd: meta.cwd,
      repository: meta.git?.repository_url,
      branch: meta.git?.branch,
      summary,
      status,
    };
  });
