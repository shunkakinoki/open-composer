import { describe, expect, it } from "bun:test";
import {
  formatOpencodeMessageForDisplay,
  parseOpencodeConversation,
  parseOpencodeMessage,
} from "../parser.js";
import type { OpencodeMessage } from "../parser.js";

describe("Opencode Parser", () => {
  describe("parseOpencodeMessage", () => {
    it("should parse user message", () => {
      const input: OpencodeMessage = {
        role: "user",
        content: "Create a component",
        timestamp: Date.now(),
      };

      const result = parseOpencodeMessage(input);

      expect(result.role).toBe("user");
      expect(result.content).toBe("Create a component");
      expect(result.timestamp).toBe(input.timestamp);
    });

    it("should parse assistant message", () => {
      const input: OpencodeMessage = {
        role: "assistant",
        content: "I'll create the component",
        timestamp: Date.now(),
      };

      const result = parseOpencodeMessage(input);

      expect(result.role).toBe("assistant");
      expect(result.content).toBe("I'll create the component");
    });

    it("should handle message without timestamp", () => {
      const input: OpencodeMessage = {
        role: "user",
        content: "Test",
      };

      const result = parseOpencodeMessage(input);

      expect(result.role).toBe("user");
      expect(result.content).toBe("Test");
      expect(result.timestamp).toBeUndefined();
    });
  });

  describe("parseOpencodeConversation", () => {
    it("should parse a full conversation", () => {
      const input: OpencodeMessage[] = [
        {
          role: "user",
          content: "Hello",
          timestamp: Date.now(),
        },
        {
          role: "assistant",
          content: "Hi",
          timestamp: Date.now(),
        },
      ];

      const result = parseOpencodeConversation(input);

      expect(result).toHaveLength(2);
      expect(result[0].role).toBe("user");
      expect(result[1].role).toBe("assistant");
    });
  });

  describe("formatOpencodeMessageForDisplay", () => {
    it("should format user message", () => {
      const message = {
        role: "user" as const,
        content: "Test message",
      };

      const result = formatOpencodeMessageForDisplay(message);

      expect(result).toContain("👤 User: Test message");
    });

    it("should format assistant message", () => {
      const message = {
        role: "assistant" as const,
        content: "Response message",
      };

      const result = formatOpencodeMessageForDisplay(message);

      expect(result).toContain("🤖 Opencode: Response message");
    });
  });
});
