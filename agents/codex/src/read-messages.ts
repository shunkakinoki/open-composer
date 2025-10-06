import * as fs from "node:fs/promises";
import { homedir } from "node:os";
import * as path from "node:path";
import * as Effect from "effect/Effect";

// -----------------------------------------------------------------------------
// Message Reading
// -----------------------------------------------------------------------------

export interface CodexJSONLEntry {
  timestamp: string;
  type: string;
  payload: {
    type?: string;
    role?: string;
    content?: Array<{ type: string; text?: string }>;
  };
}

/**
 * Read messages from a Codex session
 */
export const readCodexSessionMessages = (
  sessionId: string,
): Effect.Effect<any[], Error> =>
  Effect.gen(function* () {
    const codexDir = path.join(homedir(), ".codex", "sessions");

    // Codex session files are in format: path/to/sessionName-timestamp-uuid.jsonl
    // We need to find the file that contains this session ID
    const findSessionFile = async (dir: string): Promise<string | null> => {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);

          if (entry.isDirectory()) {
            const result = await findSessionFile(fullPath);
            if (result) return result;
          } else if (entry.isFile() && entry.name.endsWith('.jsonl') && entry.name.includes(sessionId)) {
            return fullPath;
          }
        }
      } catch {
        // Ignore errors
      }

      return null;
    };

    const sessionFile = yield* Effect.tryPromise({
      try: () => findSessionFile(codexDir),
      catch: () => null,
    }).pipe(Effect.orElse(() => Effect.succeed(null)));

    if (!sessionFile) {
      return [];
    }

    const fileContent = yield* Effect.tryPromise({
      try: () => fs.readFile(sessionFile, "utf-8"),
      catch: (error) =>
        new Error(`Failed to read session file: ${error instanceof Error ? error.message : String(error)}`),
    });

    const lines = fileContent.trim().split("\n");
    const messages: any[] = [];

    for (const line of lines) {
      try {
        const entry = JSON.parse(line) as CodexJSONLEntry;

        if (entry.type === 'response_item' && entry.payload.role && entry.payload.content) {
          const text = Array.isArray(entry.payload.content)
            ? entry.payload.content
                .filter(item => item.type === 'input_text' && item.text)
                .map(item => item.text)
                .join('\n')
            : '';

          if (text) {
            messages.push({
              type: entry.payload.role === 'user' ? 'user_message' : 'assistant_message',
              payload: {
                message: text
              },
              timestamp: entry.timestamp
            });
          }
        }
      } catch {
        continue;
      }
    }

    return messages;
  });
