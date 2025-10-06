import { describe, expect, test } from "bun:test";
import * as aiSessions from "../index.js";

describe("ai-sessions index re-exports", () => {
  describe("claude-code exports", () => {
    test("should export parseClaudeCodeMessage", () => {
      expect(aiSessions.parseClaudeCodeMessage).toBeDefined();
      expect(typeof aiSessions.parseClaudeCodeMessage).toBe("function");
    });

    test("should export parseClaudeCodeConversation", () => {
      expect(aiSessions.parseClaudeCodeConversation).toBeDefined();
      expect(typeof aiSessions.parseClaudeCodeConversation).toBe("function");
    });

    test("should export formatClaudeCodeMessageForDisplay", () => {
      expect(aiSessions.formatClaudeCodeMessageForDisplay).toBeDefined();
      expect(typeof aiSessions.formatClaudeCodeMessageForDisplay).toBe(
        "function",
      );
    });
  });

  describe("cursor exports", () => {
    test("should export parseCursorMessage", () => {
      expect(aiSessions.parseCursorMessage).toBeDefined();
      expect(typeof aiSessions.parseCursorMessage).toBe("function");
    });

    test("should export parseCursorConversation", () => {
      expect(aiSessions.parseCursorConversation).toBeDefined();
      expect(typeof aiSessions.parseCursorConversation).toBe("function");
    });

    test("should export formatCursorMessageForDisplay", () => {
      expect(aiSessions.formatCursorMessageForDisplay).toBeDefined();
      expect(typeof aiSessions.formatCursorMessageForDisplay).toBe("function");
    });
  });

  describe("codex exports", () => {
    test("should export parseCodexMessage", () => {
      expect(aiSessions.parseCodexMessage).toBeDefined();
      expect(typeof aiSessions.parseCodexMessage).toBe("function");
    });

    test("should export parseCodexConversation", () => {
      expect(aiSessions.parseCodexConversation).toBeDefined();
      expect(typeof aiSessions.parseCodexConversation).toBe("function");
    });

    test("should export formatCodexMessageForDisplay", () => {
      expect(aiSessions.formatCodexMessageForDisplay).toBeDefined();
      expect(typeof aiSessions.formatCodexMessageForDisplay).toBe("function");
    });
  });

  describe("opencode exports", () => {
    test("should export parseOpencodeMessage", () => {
      expect(aiSessions.parseOpencodeMessage).toBeDefined();
      expect(typeof aiSessions.parseOpencodeMessage).toBe("function");
    });

    test("should export parseOpencodeConversation", () => {
      expect(aiSessions.parseOpencodeConversation).toBeDefined();
      expect(typeof aiSessions.parseOpencodeConversation).toBe("function");
    });

    test("should export formatOpencodeMessageForDisplay", () => {
      expect(aiSessions.formatOpencodeMessageForDisplay).toBeDefined();
      expect(typeof aiSessions.formatOpencodeMessageForDisplay).toBe(
        "function",
      );
    });
  });

  describe("streaming-viewer exports", () => {
    test("should export formatConversationForDisplay", () => {
      expect(aiSessions.formatConversationForDisplay).toBeDefined();
      expect(typeof aiSessions.formatConversationForDisplay).toBe("function");
    });

    test("should export streamConversation", () => {
      expect(aiSessions.streamConversation).toBeDefined();
      expect(typeof aiSessions.streamConversation).toBe("function");
    });

    test("should export getConversationFromSession", () => {
      expect(aiSessions.getConversationFromSession).toBeDefined();
      expect(typeof aiSessions.getConversationFromSession).toBe("function");
    });
  });

  describe("service exports", () => {
    test("should export AgentSessionsService", () => {
      expect(aiSessions.AgentSessionsService).toBeDefined();
      expect(typeof aiSessions.AgentSessionsService).toBe("function");
    });

    test("should be able to create AgentSessionsService instance", () => {
      const service = new aiSessions.AgentSessionsService();
      expect(service).toBeDefined();
      expect(service.getAllSessions).toBeDefined();
      expect(typeof service.getAllSessions).toBe("function");
    });
  });

  describe("functional integration", () => {
    test("should parse and format claude-code message", () => {
      const message = {
        type: "user" as const,
        text: "Hello",
        timestamp: "2025-01-01T00:00:00Z",
      };

      const parsed = aiSessions.parseClaudeCodeMessage(message);
      expect(parsed.role).toBe("user");
      expect(parsed.content).toBe("Hello");

      const formatted = aiSessions.formatClaudeCodeMessageForDisplay(parsed);
      expect(formatted).toContain("👤 User: Hello");
    });

    test("should parse and format cursor message", () => {
      const message = {
        role: "assistant" as const,
        content: "Test",
        createdAt: Date.now(),
      };

      const parsed = aiSessions.parseCursorMessage(message);
      expect(parsed.role).toBe("assistant");

      const formatted = aiSessions.formatCursorMessageForDisplay(parsed);
      expect(formatted).toContain("🤖 Cursor");
    });

    test("should parse and format codex message", () => {
      const message = {
        type: "user_message" as const,
        payload: { message: "Test" },
        timestamp: "2025-01-01T00:00:00Z",
      };

      const parsed = aiSessions.parseCodexMessage(message);
      expect(parsed?.role).toBe("user");

      if (parsed) {
        const formatted = aiSessions.formatCodexMessageForDisplay(parsed);
        expect(formatted).toContain("👤 User");
      }
    });

    test("should parse and format opencode message", () => {
      const message = {
        role: "user" as const,
        content: "Test",
        timestamp: Date.now(),
      };

      const parsed = aiSessions.parseOpencodeMessage(message);
      expect(parsed.role).toBe("user");

      const formatted = aiSessions.formatOpencodeMessageForDisplay(parsed);
      expect(formatted).toContain("👤 User");
    });
  });
});
