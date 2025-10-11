import * as fs from "node:fs/promises";
import { homedir } from "node:os";
import * as path from "node:path";
import * as Effect from "effect/Effect";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface ClaudeCodeJSONLMessage {
  type?: string;
  message?: {
    role?: string;
    content?: string | Array<{ type: string; text?: string; tool_use?: unknown; tool_result?: unknown }>;
  };
  timestamp?: string;
  toolUseResult?: {
    stdout?: string;
    stderr?: string;
  };
  [key: string]: unknown;
}

function extractTextFromContent(content: string | Array<{ type: string; text?: string; tool_use?: unknown; tool_result?: unknown }>): string {
  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map(item => {
        if (item.type === 'text' && item.text) {
          return item.text;
        }
        if (item.type === 'tool_use') {
          return `[Tool Use: ${JSON.stringify(item.tool_use)}]`;
        }
        return '';
      })
      .filter(Boolean)
      .join('\n');
  }

  return '';
}

// -----------------------------------------------------------------------------
// Message Reading
// -----------------------------------------------------------------------------

/**
 * Read messages from a Claude Code session
 */
export const readClaudeCodeSessionMessages = (
  sessionId: string,
): Effect.Effect<ClaudeCodeJSONLMessage[], Error> =>
  Effect.gen(function* () {
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

      const fileContent = yield* Effect.tryPromise({
        try: () => fs.readFile(sessionFilePath, "utf-8"),
        catch: (error) =>
          new Error(`Failed to read session file: ${error instanceof Error ? error.message : String(error)}`),
      });

      const lines = fileContent.trim().split("\n");
      const messages: any[] = [];

      for (const line of lines) {
        try {
          const entry = JSON.parse(line) as ClaudeCodeJSONLMessage;
          if (entry.message && entry.message.role && entry.message.content) {
            // Convert to ClaudeCodeMessage format expected by parser
            const text = extractTextFromContent(entry.message.content);

            // Extract tool use if present
            const toolUse = Array.isArray(entry.message.content)
              ? entry.message.content
                  .filter(item => item.type === 'tool_use' && item.tool_use)
                  .map(item => item.tool_use)
              : undefined;

            messages.push({
              type: entry.message.role === 'user' ? 'user' : 'assistant',
              text,
              timestamp: entry.timestamp,
              ...(toolUse && toolUse.length > 0 ? { toolUse } : {})
            });
          }
        } catch {
          continue;
        }
      }

      return messages;
    }

    return [];
  });
