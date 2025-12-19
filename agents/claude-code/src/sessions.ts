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

interface ClaudeCodeJSONLEntry {
  sessionId?: string;
  cwd?: string;
  gitBranch?: string;
  timestamp?: string;
  type?: string;
  message?: {
    role?: string;
    content?: string;
  };
  [key: string]: unknown;
}

// -----------------------------------------------------------------------------
// Claude Code Session Parser
// -----------------------------------------------------------------------------

// Claude Code stores sessions as JSONL files in project directories
// Location: ~/.claude/projects/{project-dir}/{sessionId}.jsonl
// Each JSONL file contains multiple JSON objects, one per line

export const parseClaudeCodeSessions = (): Effect.Effect<
  ClaudeCodeSession[],
  Error
> =>
  Effect.gen(function* () {
    const claudeProjectsDir = path.join(homedir(), ".claude", "projects");

    // Check if projects directory exists
    const projectsDirExists = yield* Effect.tryPromise({
      try: () => fs.access(claudeProjectsDir).then(() => true),
      catch: () => false,
    }).pipe(Effect.orElse(() => Effect.succeed(false)));

    if (!projectsDirExists) {
      return [];
    }

    // List all project directories
    const projectDirs = yield* Effect.tryPromise({
      try: () => fs.readdir(claudeProjectsDir, { withFileTypes: true }),
      catch: (error) =>
        new Error(
          `Failed to read Claude projects directory: ${error instanceof Error ? error.message : String(error)}`,
        ),
    }).pipe(Effect.orElse(() => Effect.succeed([])));

    const sessions: ClaudeCodeSession[] = [];

    // Iterate through each project directory
    for (const projectDir of projectDirs) {
      if (!projectDir.isDirectory()) continue;

      const projectPath = path.join(claudeProjectsDir, projectDir.name);

      // Read all JSONL files in this project directory
      const sessionFiles = yield* Effect.tryPromise({
        try: () => fs.readdir(projectPath, { withFileTypes: true }),
        catch: () => [],
      }).pipe(Effect.orElse(() => Effect.succeed([])));

      for (const sessionFile of sessionFiles) {
        if (!sessionFile.isFile() || !sessionFile.name.endsWith(".jsonl")) continue;

        const sessionFilePath = path.join(projectPath, sessionFile.name);
        const sessionId = sessionFile.name.replace(".jsonl", "");

        // Read JSONL file and parse entries
        const fileContent = yield* Effect.tryPromise({
          try: () => fs.readFile(sessionFilePath, "utf-8"),
          catch: () => null,
        }).pipe(Effect.orElse(() => Effect.succeed(null)));

        if (!fileContent) continue;

        // Parse JSONL (one JSON object per line)
        const lines = fileContent.trim().split("\n");
        const entries: ClaudeCodeJSONLEntry[] = [];

        for (const line of lines) {
          try {
            const entry = JSON.parse(line) as ClaudeCodeJSONLEntry;
            entries.push(entry);
          } catch {
            // Skip invalid JSON lines
            continue;
          }
        }

        // Extract session metadata from entries
        const firstEntry = entries.find((e) => e.cwd && e.sessionId);
        const userMessages = entries.filter((e) => e.type === "user" && e.message?.role === "user");

        if (!firstEntry) continue;

        // Decode project directory name to get repository path
        // Format: -Users-shunkakinoki-path-to-repo -> /Users/shunkakinoki/path/to/repo
        let repository = firstEntry.cwd;
        if (projectDir.name.startsWith("-")) {
          repository = projectDir.name.slice(1).replace(/-/g, "/");
        }

        // Get first user message as summary
        const firstUserMessage = userMessages[0]?.message?.content;
        const summary = firstUserMessage && typeof firstUserMessage === "string"
          ? firstUserMessage.substring(0, 100)
          : undefined;

        sessions.push({
          id: sessionId,
          agent: "claude-code",
          timestamp: firstEntry.timestamp ? new Date(firstEntry.timestamp) : new Date(0),
          cwd: firstEntry.cwd,
          repository,
          branch: firstEntry.gitBranch,
          summary,
          status: userMessages.length > 0 ? "completed" : "active",
        });
      }
    }

    return sessions.sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
    );
  });

// -----------------------------------------------------------------------------
// Message Reading
// -----------------------------------------------------------------------------

export interface ClaudeCodeJSONLMessage {
  type?: string;
  message?: {
    role?: string;
    content?: string | Array<{ type: string; text?: string }>;
  };
  timestamp?: string;
  [key: string]: unknown;
}

/**
 * Read messages from a Claude Code session
 */
export const readClaudeCodeSessionMessages = (
  sessionId: string,
): Effect.Effect<ClaudeCodeJSONLMessage[], Error> =>
  Effect.gen(function* () {
    // Try to find the session file in the Claude projects directory
    const claudeProjectsDir = path.join(homedir(), ".claude", "projects");

    const projectsDirExists = yield* Effect.tryPromise({
      try: () => fs.access(claudeProjectsDir).then(() => true),
      catch: () => false,
    }).pipe(Effect.orElse(() => Effect.succeed(false)));

    if (!projectsDirExists) {
      return [];
    }

    const projectDirs = yield* Effect.tryPromise({
      try: () => fs.readdir(claudeProjectsDir, { withFileTypes: true }),
      catch: () => [],
    }).pipe(Effect.orElse(() => Effect.succeed([])));

    // Search for the session file across all project directories
    for (const projectDir of projectDirs) {
      if (!projectDir.isDirectory()) continue;

      const sessionFilePath = path.join(
        claudeProjectsDir,
        projectDir.name,
        `${sessionId}.jsonl`
      );

      const fileExists = yield* Effect.tryPromise({
        try: () => fs.access(sessionFilePath).then(() => true),
        catch: () => false,
      }).pipe(Effect.orElse(() => Effect.succeed(false)));

      if (!fileExists) continue;

      // Read and parse JSONL file
      const fileContent = yield* Effect.tryPromise({
        try: () => fs.readFile(sessionFilePath, "utf-8"),
        catch: (error) =>
          new Error(`Failed to read session file: ${error instanceof Error ? error.message : String(error)}`),
      });

      // Parse JSONL (one JSON object per line)
      const lines = fileContent.trim().split("\n");
      const messages: ClaudeCodeJSONLMessage[] = [];

      for (const line of lines) {
        try {
          const entry = JSON.parse(line) as ClaudeCodeJSONLMessage;
          // Only include actual message entries
          if (entry.message && entry.message.role) {
            messages.push(entry);
          }
        } catch {
          // Skip invalid JSON lines
          continue;
        }
      }

      return messages;
    }

    return [];
  });
