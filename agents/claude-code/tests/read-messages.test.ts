import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import * as Effect from "effect/Effect";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { homedir } from "node:os";
import { readClaudeCodeSessionMessages } from "../src/read-messages.js";

describe("readClaudeCodeSessionMessages", () => {
  const testProjectDir = path.join(homedir(), ".claude", "projects", "test-project-12345");
  const testSessionId = "test-session-abc123";
  const testSessionFile = path.join(testProjectDir, `${testSessionId}.jsonl`);

  beforeAll(async () => {
    await fs.mkdir(testProjectDir, { recursive: true });
  });

  afterAll(async () => {
    await fs.rm(testProjectDir, { recursive: true, force: true });
  });

  it("should return empty array for non-existent session", async () => {
    const messages = await readClaudeCodeSessionMessages("non-existent-id")
      .pipe(Effect.runPromise);

    expect(messages).toEqual([]);
  });

  it("should parse simple text messages from JSONL", async () => {
    const jsonlContent = [
      JSON.stringify({
        type: "user",
        message: {
          role: "user",
          content: [{ type: "text", text: "Hello, can you help me?" }]
        },
        timestamp: "2025-10-06T10:00:00Z"
      }),
      JSON.stringify({
        type: "assistant",
        message: {
          role: "assistant",
          content: [{ type: "text", text: "Of course! I'd be happy to help." }]
        },
        timestamp: "2025-10-06T10:00:05Z"
      })
    ].join('\n');

    await fs.writeFile(testSessionFile, jsonlContent);

    const messages = await readClaudeCodeSessionMessages(testSessionId)
      .pipe(Effect.runPromise);

    expect(messages).toHaveLength(2);
    expect(messages[0]).toMatchObject({
      type: "user",
      text: "Hello, can you help me?",
      timestamp: "2025-10-06T10:00:00Z"
    });
    expect(messages[1]).toMatchObject({
      type: "assistant",
      text: "Of course! I'd be happy to help.",
      timestamp: "2025-10-06T10:00:05Z"
    });
  });

  it("should handle array content with multiple text items", async () => {
    const jsonlContent = JSON.stringify({
      type: "assistant",
      message: {
        role: "assistant",
        content: [
          { type: "text", text: "First part" },
          { type: "text", text: "Second part" }
        ]
      },
      timestamp: "2025-10-06T10:00:00Z"
    });

    await fs.writeFile(testSessionFile, jsonlContent);

    const messages = await readClaudeCodeSessionMessages(testSessionId)
      .pipe(Effect.runPromise);

    expect(messages).toHaveLength(1);
    expect(messages[0].text).toContain("First part");
    expect(messages[0].text).toContain("Second part");
  });

  it("should extract tool use from content", async () => {
    const jsonlContent = JSON.stringify({
      type: "assistant",
      message: {
        role: "assistant",
        content: [
          { type: "text", text: "Let me read that file" },
          {
            type: "tool_use",
            tool_use: {
              id: "tool-1",
              name: "Read",
              input: { file_path: "/test/file.ts" }
            }
          }
        ]
      },
      timestamp: "2025-10-06T10:00:00Z"
    });

    await fs.writeFile(testSessionFile, jsonlContent);

    const messages = await readClaudeCodeSessionMessages(testSessionId)
      .pipe(Effect.runPromise);

    expect(messages).toHaveLength(1);
    expect(messages[0].text).toContain("Let me read that file");
    expect(messages[0].toolUse).toBeDefined();
    expect(messages[0].toolUse).toHaveLength(1);
  });

  it("should handle string content", async () => {
    const jsonlContent = JSON.stringify({
      type: "user",
      message: {
        role: "user",
        content: "Simple string message"
      },
      timestamp: "2025-10-06T10:00:00Z"
    });

    await fs.writeFile(testSessionFile, jsonlContent);

    const messages = await readClaudeCodeSessionMessages(testSessionId)
      .pipe(Effect.runPromise);

    expect(messages).toHaveLength(1);
    expect(messages[0].text).toBe("Simple string message");
  });

  it("should handle malformed JSON lines gracefully", async () => {
    const jsonlContent = [
      "{ invalid json }",
      JSON.stringify({
        type: "user",
        message: {
          role: "user",
          content: [{ type: "text", text: "Valid message" }]
        },
        timestamp: "2025-10-06T10:00:00Z"
      })
    ].join('\n');

    await fs.writeFile(testSessionFile, jsonlContent);

    const messages = await readClaudeCodeSessionMessages(testSessionId)
      .pipe(Effect.runPromise);

    expect(messages).toHaveLength(1);
    expect(messages[0].text).toBe("Valid message");
  });
});
