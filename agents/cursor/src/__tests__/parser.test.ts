import { describe, expect, it } from "bun:test";
import {
  formatCursorMessageForDisplay,
  parseCursorConversation,
  parseCursorMessage,
} from "../parser.js";
import type { CursorMessage } from "../parser.js";

describe("Cursor Parser", () => {
  describe("parseCursorMessage", () => {
    it("should parse user message", () => {
      const input: CursorMessage = {
        role: "user",
        content: "Add a new feature",
        createdAt: Date.now(),
      };

      const result = parseCursorMessage(input);

      expect(result.role).toBe("user");
      expect(result.content).toBe("Add a new feature");
      expect(result.timestamp).toBe(input.createdAt);
    });

    it("should parse assistant message", () => {
      const input: CursorMessage = {
        role: "assistant",
        content: "I'll add that feature for you",
        createdAt: Date.now(),
      };

      const result = parseCursorMessage(input);

      expect(result.role).toBe("assistant");
      expect(result.content).toBe("I'll add that feature for you");
    });

    it("should parse system message", () => {
      const input: CursorMessage = {
        role: "system",
        content: "Context updated",
      };

      const result = parseCursorMessage(input);

      expect(result.role).toBe("system");
      expect(result.content).toBe("Context updated");
    });
  });

  describe("parseCursorConversation", () => {
    it("should parse a full conversation", () => {
      const input: CursorMessage[] = [
        {
          role: "user",
          content: "Hello",
          createdAt: Date.now(),
        },
        {
          role: "assistant",
          content: "Hi there",
          createdAt: Date.now(),
        },
      ];

      const result = parseCursorConversation(input);

      expect(result).toHaveLength(2);
      expect(result[0].role).toBe("user");
      expect(result[1].role).toBe("assistant");
    });
  });

  describe("formatCursorMessageForDisplay", () => {
    it("should format user message", () => {
      const message = {
        role: "user" as const,
        content: "Test message",
      };

      const result = formatCursorMessageForDisplay(message);

      expect(result).toContain("👤 User: Test message");
    });

    it("should format assistant message", () => {
      const message = {
        role: "assistant" as const,
        content: "Response message",
      };

      const result = formatCursorMessageForDisplay(message);

      expect(result).toContain("🤖 Cursor: Response message");
    });

    it("should format system message", () => {
      const message = {
        role: "system" as const,
        content: "System update",
      };

      const result = formatCursorMessageForDisplay(message);

      expect(result).toContain("⚙️  System: System update");
    });
  });
});
