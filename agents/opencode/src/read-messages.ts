import * as fs from "node:fs/promises";
import { homedir } from "node:os";
import * as path from "node:path";
import * as Effect from "effect/Effect";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface OpencodeMessage {
  id: string;
  role: "user" | "assistant";
  sessionID: string;
  time: {
    created: number;
  };
}

interface OpencodePart {
  id: string;
  messageID: string;
  sessionID: string;
  type: string;
  text?: string;
  toolInvocation?: {
    toolName?: string;
    args?: unknown;
    result?: string;
  };
  time?: {
    start: number;
    end: number;
  };
}

// -----------------------------------------------------------------------------
// Message Reading
// -----------------------------------------------------------------------------

const getOpencodeDataDir = (): string => {
  const xdgData =
    process.env.XDG_DATA_HOME || path.join(homedir(), ".local", "share");
  return path.join(xdgData, "opencode");
};

/**
 * Read messages from an OpenCode session
 */
export const readOpencodeSessionMessages = (
  sessionId: string,
): Effect.Effect<any[], Error> =>
  Effect.gen(function* () {
    const opencodeDir = getOpencodeDataDir();
    const storageDir = path.join(opencodeDir, "storage");
    const messageDir = path.join(storageDir, "message", sessionId);
    const partDir = path.join(storageDir, "part");

    // Check if message directory exists
    const messageDirExists = yield* Effect.tryPromise({
      try: () => fs.access(messageDir).then(() => true),
      catch: () => false,
    }).pipe(Effect.orElse(() => Effect.succeed(false)));

    if (!messageDirExists) {
      return [];
    }

    // Read all message files
    const messageFiles = yield* Effect.tryPromise({
      try: () => fs.readdir(messageDir, { withFileTypes: true }),
      catch: () => [],
    }).pipe(Effect.orElse(() => Effect.succeed([])));

    const messages: any[] = [];

    for (const messageFile of messageFiles) {
      if (!messageFile.isFile() || !messageFile.name.endsWith('.json')) continue;

      const messageFilePath = path.join(messageDir, messageFile.name);

      const message = yield* Effect.tryPromise({
        try: async () => {
          const content = await fs.readFile(messageFilePath, "utf-8");
          return JSON.parse(content) as OpencodeMessage;
        },
        catch: () => null,
      }).pipe(Effect.orElse(() => Effect.succeed(null)));

      if (!message) continue;

      // Read parts for this message
      const messagePartDir = path.join(partDir, message.id);
      const parts: OpencodePart[] = [];

      const partDirExists = yield* Effect.tryPromise({
        try: () => fs.access(messagePartDir).then(() => true),
        catch: () => false,
      }).pipe(Effect.orElse(() => Effect.succeed(false)));

      if (partDirExists) {
        const partFiles = yield* Effect.tryPromise({
          try: () => fs.readdir(messagePartDir, { withFileTypes: true }),
          catch: () => [],
        }).pipe(Effect.orElse(() => Effect.succeed([])));

        for (const partFile of partFiles) {
          if (!partFile.isFile() || !partFile.name.endsWith('.json')) continue;

          const partFilePath = path.join(messagePartDir, partFile.name);

          const part = yield* Effect.tryPromise({
            try: async () => {
              const content = await fs.readFile(partFilePath, "utf-8");
              return JSON.parse(content) as OpencodePart;
            },
            catch: () => null,
          }).pipe(Effect.orElse(() => Effect.succeed(null)));

          if (part) {
            parts.push(part);
          }
        }
      }

      // Sort parts by time
      parts.sort((a, b) => {
        const aTime = a.time?.start || 0;
        const bTime = b.time?.start || 0;
        return aTime - bTime;
      });

      // Combine text parts
      const text = parts
        .filter(p => p.type === 'text' && p.text)
        .map(p => p.text)
        .join('\n');

      // Extract tool invocations
      const toolCalls = parts
        .filter(p => p.type === 'tool-invocation' && p.toolInvocation)
        .map(p => p.toolInvocation);

      messages.push({
        role: message.role,
        content: text || '',
        timestamp: message.time.created,
        ...(toolCalls.length > 0 ? { toolCalls } : {})
      });
    }

    // Sort messages by timestamp
    messages.sort((a, b) => a.timestamp - b.timestamp);

    return messages;
  });
