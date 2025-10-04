import { describe, expect, test } from "bun:test";
import * as Effect from "effect/Effect";
import {
  formatConversationForDisplay,
  getConversationFromSession,
} from "../streaming-viewer.js";
import type { Conversation } from "../streaming-types.js";
import type { AISession } from "../types.js";

describe("streaming-viewer", () => {
  describe("formatConversationForDisplay", () => {
    test("should format basic conversation", () => {
      const conversation: Conversation = {
        id: "test-123",
        agent: "claude-code",
        messages: [
          { role: "user", content: "Hello" },
          { role: "assistant", content: "Hi there" },
        ],
        metadata: {
          timestamp: new Date("2025-01-01T00:00:00Z"),
          cwd: "/test",
          repository: "test-repo",
          branch: "main",
        },
      };

      const output = formatConversationForDisplay(conversation);

      expect(output).toContain("Agent: claude-code");
      expect(output).toContain("Repository: test-repo");
      expect(output).toContain("Branch: main");
      expect(output).toContain("Working Directory: /test");
      expect(output).toContain("👤 User: Hello");
      expect(output).toContain("🤖 Claude: Hi there");
    });

    test("should format conversation without optional metadata", () => {
      const conversation: Conversation = {
        id: "test-456",
        agent: "cursor",
        messages: [{ role: "user", content: "Test" }],
        metadata: {
          timestamp: new Date("2025-01-01T00:00:00Z"),
        },
      };

      const output = formatConversationForDisplay(conversation);

      expect(output).toContain("Agent: cursor");
      expect(output).not.toContain("Repository:");
      expect(output).not.toContain("Branch:");
      expect(output).not.toContain("Working Directory:");
    });

    test("should format cursor conversation", () => {
      const conversation: Conversation = {
        id: "cursor-1",
        agent: "cursor",
        messages: [
          { role: "user", content: "Fix this bug" },
          { role: "assistant", content: "I'll help" },
        ],
        metadata: {
          timestamp: new Date(),
        },
      };

      const output = formatConversationForDisplay(conversation);

      expect(output).toContain("Agent: cursor");
      expect(output).toContain("👤 User: Fix this bug");
      expect(output).toContain("🤖 Cursor: I'll help");
    });

    test("should format codex conversation with tool calls", () => {
      const conversation: Conversation = {
        id: "codex-1",
        agent: "codex",
        messages: [
          { role: "user", content: "Read file" },
          {
            role: "assistant",
            content: "Reading file",
            toolCalls: [
              {
                id: "tool-1",
                name: "read_file",
                arguments: { path: "/test.txt" },
              },
            ],
          },
        ],
        metadata: {
          timestamp: new Date(),
        },
      };

      const output = formatConversationForDisplay(conversation);

      expect(output).toContain("Agent: codex");
      expect(output).toContain("🔧 Tool: read_file");
    });

    test("should format opencode conversation", () => {
      const conversation: Conversation = {
        id: "opencode-1",
        agent: "opencode",
        messages: [
          { role: "user", content: "Generate code" },
          { role: "assistant", content: "Here's the code" },
        ],
        metadata: {
          timestamp: new Date(),
        },
      };

      const output = formatConversationForDisplay(conversation);

      expect(output).toContain("Agent: opencode");
      expect(output).toContain("🤖 Opencode");
    });

    test("should handle unknown agent type", () => {
      const conversation: Conversation = {
        id: "unknown-1",
        agent: "unknown" as any,
        messages: [{ role: "user", content: "Test" }],
        metadata: {
          timestamp: new Date(),
        },
      };

      const output = formatConversationForDisplay(conversation);

      expect(output).toContain("Agent: unknown");
      expect(output).toContain("user: Test");
    });
  });

  describe("getConversationFromSession", () => {
    test("should parse claude-code session", async () => {
      const session: AISession = {
        id: "claude-123",
        agent: "claude-code",
        timestamp: new Date("2025-01-01T00:00:00Z"),
        cwd: "/test",
        repository: "test-repo",
        branch: "main",
        status: "active",
      };

      const messages = [
        {
          type: "user",
          text: "Hello",
          timestamp: "2025-01-01T00:00:00Z",
        },
        {
          type: "assistant",
          text: "Hi",
          timestamp: "2025-01-01T00:01:00Z",
        },
      ];

      const result = await Effect.runPromise(
        getConversationFromSession(session, messages),
      );

      expect(result.id).toBe("claude-123");
      expect(result.agent).toBe("claude-code");
      expect(result.messages).toHaveLength(2);
      expect(result.messages[0].role).toBe("user");
      expect(result.messages[0].content).toBe("Hello");
    });

    test("should parse cursor session", async () => {
      const session: AISession = {
        id: "cursor-123",
        agent: "cursor",
        timestamp: new Date(),
        cwd: "/test",
        status: "completed",
      };

      const messages = [
        { role: "user", content: "Test", createdAt: Date.now() },
      ];

      const result = await Effect.runPromise(
        getConversationFromSession(session, messages),
      );

      expect(result.agent).toBe("cursor");
      expect(result.messages).toHaveLength(1);
    });

    test("should parse codex session", async () => {
      const session: AISession = {
        id: "codex-123",
        agent: "codex",
        timestamp: new Date(),
        cwd: "/test",
        status: "active",
      };

      const messages = [
        {
          type: "user_message",
          payload: { message: "Test" },
          timestamp: "2025-01-01T00:00:00Z",
        },
      ];

      const result = await Effect.runPromise(
        getConversationFromSession(session, messages),
      );

      expect(result.agent).toBe("codex");
      expect(result.messages).toHaveLength(1);
    });

    test("should parse opencode session", async () => {
      const session: AISession = {
        id: "opencode-123",
        agent: "opencode",
        timestamp: new Date(),
        cwd: "/test",
        status: "active",
      };

      const messages = [
        { role: "user", content: "Test", timestamp: Date.now() },
      ];

      const result = await Effect.runPromise(
        getConversationFromSession(session, messages),
      );

      expect(result.agent).toBe("opencode");
      expect(result.messages).toHaveLength(1);
    });

    test("should handle cursor-agent alias", async () => {
      const session: AISession = {
        id: "cursor-agent-123",
        agent: "cursor-agent",
        timestamp: new Date(),
        cwd: "/test",
        status: "active",
      };

      const messages: Array<{ role: string; content: string }> = [
        { role: "user", content: "Test" },
      ];

      const result = await Effect.runPromise(
        getConversationFromSession(session, messages),
      );

      expect(result.agent).toBe("cursor-agent");
      expect(result.messages).toHaveLength(1);
    });

    test("should fail for unknown agent type", async () => {
      const session: AISession = {
        id: "unknown-123",
        agent: "unknown-agent" as any,
        timestamp: new Date(),
        cwd: "/test",
        status: "failed",
      };

      const messages: unknown[] = [];

      const result = Effect.runPromise(
        getConversationFromSession(session, messages),
      );

      await expect(result).rejects.toThrow("Unknown agent type");
    });

    test("should preserve metadata in conversation", async () => {
      const session: AISession = {
        id: "test-123",
        agent: "claude-code",
        timestamp: new Date("2025-01-01T00:00:00Z"),
        cwd: "/custom/path",
        repository: "my-repo",
        branch: "feature-branch",
        status: "completed",
      };

      const messages = [{ type: "user", text: "Test" }];

      const result = await Effect.runPromise(
        getConversationFromSession(session, messages),
      );

      expect(result.metadata?.cwd).toBe("/custom/path");
      expect(result.metadata?.repository).toBe("my-repo");
      expect(result.metadata?.branch).toBe("feature-branch");
      expect(result.metadata?.timestamp).toEqual(session.timestamp);
    });
  });
});
