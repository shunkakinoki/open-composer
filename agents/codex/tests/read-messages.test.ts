import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import * as Effect from "effect/Effect";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { homedir } from "node:os";
import { readCodexSessionMessages } from "../src/read-messages.js";

describe("readCodexSessionMessages", () => {
  const testSessionId = "test-abc123-def456";
  const testSessionsDir = path.join(homedir(), ".codex", "sessions", "test");
  const testSessionFile = path.join(testSessionsDir, `rollout-2025-10-06T10-00-00-${testSessionId}.jsonl`);

  beforeAll(async () => {
    await fs.mkdir(testSessionsDir, { recursive: true });
  });

  afterAll(async () => {
    await fs.rm(path.join(homedir(), ".codex", "sessions", "test"), { recursive: true, force: true });
  });

  it("should return empty array for non-existent session", async () => {
    const messages = await readCodexSessionMessages("non-existent-session-id")
      .pipe(Effect.runPromise);

    expect(messages).toEqual([]);
  });

  it("should parse user and assistant messages from JSONL", async () => {
    const jsonlContent = [
      JSON.stringify({
        timestamp: "2025-10-06T10:00:00Z",
        type: "session_meta",
        payload: { id: testSessionId }
      }),
      JSON.stringify({
        timestamp: "2025-10-06T10:00:01Z",
        type: "response_item",
        payload: {
          type: "message",
          role: "user",
          content: [{ type: "input_text", text: "Fix the bug in auth.ts" }]
        }
      }),
      JSON.stringify({
        timestamp: "2025-10-06T10:00:05Z",
        type: "response_item",
        payload: {
          type: "message",
          role: "assistant",
          content: [{ type: "input_text", text: "I'll help you fix that bug." }]
        }
      })
    ].join('\n');

    await fs.writeFile(testSessionFile, jsonlContent);

    const messages = await readCodexSessionMessages(testSessionId)
      .pipe(Effect.runPromise);

    expect(messages).toHaveLength(2);
    expect(messages[0]).toMatchObject({
      type: "user_message",
      payload: {
        message: "Fix the bug in auth.ts"
      },
      timestamp: "2025-10-06T10:00:01Z"
    });
    expect(messages[1]).toMatchObject({
      type: "assistant_message",
      payload: {
        message: "I'll help you fix that bug."
      },
      timestamp: "2025-10-06T10:00:05Z"
    });
  });

  it("should handle multiple content items", async () => {
    const jsonlContent = JSON.stringify({
      timestamp: "2025-10-06T10:00:00Z",
      type: "response_item",
      payload: {
        type: "message",
        role: "user",
        content: [
          { type: "input_text", text: "First part" },
          { type: "input_text", text: "Second part" }
        ]
      }
    });

    await fs.writeFile(testSessionFile, jsonlContent);

    const messages = await readCodexSessionMessages(testSessionId)
      .pipe(Effect.runPromise);

    expect(messages).toHaveLength(1);
    expect(messages[0].payload.message).toContain("First part");
    expect(messages[0].payload.message).toContain("Second part");
  });

  it("should skip non-response_item entries", async () => {
    const jsonlContent = [
      JSON.stringify({
        timestamp: "2025-10-06T10:00:00Z",
        type: "session_meta",
        payload: { id: testSessionId }
      }),
      JSON.stringify({
        timestamp: "2025-10-06T10:00:01Z",
        type: "response_item",
        payload: {
          type: "message",
          role: "user",
          content: [{ type: "input_text", text: "Valid message" }]
        }
      }),
      JSON.stringify({
        timestamp: "2025-10-06T10:00:02Z",
        type: "other_type",
        payload: {}
      })
    ].join('\n');

    await fs.writeFile(testSessionFile, jsonlContent);

    const messages = await readCodexSessionMessages(testSessionId)
      .pipe(Effect.runPromise);

    expect(messages).toHaveLength(1);
    expect(messages[0].payload.message).toBe("Valid message");
  });

  it("should filter out non-input_text content types", async () => {
    const jsonlContent = JSON.stringify({
      timestamp: "2025-10-06T10:00:00Z",
      type: "response_item",
      payload: {
        type: "message",
        role: "user",
        content: [
          { type: "input_text", text: "Text message" },
          { type: "other_type", data: "something" }
        ]
      }
    });

    await fs.writeFile(testSessionFile, jsonlContent);

    const messages = await readCodexSessionMessages(testSessionId)
      .pipe(Effect.runPromise);

    expect(messages).toHaveLength(1);
    expect(messages[0].payload.message).toBe("Text message");
    expect(messages[0].payload.message).not.toContain("something");
  });

  it("should handle malformed JSON gracefully", async () => {
    const jsonlContent = [
      "{ invalid json",
      JSON.stringify({
        timestamp: "2025-10-06T10:00:00Z",
        type: "response_item",
        payload: {
          type: "message",
          role: "user",
          content: [{ type: "input_text", text: "Valid" }]
        }
      })
    ].join('\n');

    await fs.writeFile(testSessionFile, jsonlContent);

    const messages = await readCodexSessionMessages(testSessionId)
      .pipe(Effect.runPromise);

    expect(messages).toHaveLength(1);
    expect(messages[0].payload.message).toBe("Valid");
  });

  it("should return empty for entries without content", async () => {
    const jsonlContent = JSON.stringify({
      timestamp: "2025-10-06T10:00:00Z",
      type: "response_item",
      payload: {
        type: "message",
        role: "user",
        content: []
      }
    });

    await fs.writeFile(testSessionFile, jsonlContent);

    const messages = await readCodexSessionMessages(testSessionId)
      .pipe(Effect.runPromise);

    expect(messages).toEqual([]);
  });
});
