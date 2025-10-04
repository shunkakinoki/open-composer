import { describe, expect, it } from "bun:test";
import {
  formatClaudeCodeMessageForDisplay,
  parseClaudeCodeConversation,
  parseClaudeCodeMessage,
  type ClaudeCodeMessage,
} from "../parser.js";

describe("Claude Code Parser", () => {
  describe("parseClaudeCodeMessage", () => {
    it("should parse user message", () => {
      const input: ClaudeCodeMessage = {
        type: "user",
        text: "Hello, can you help me?",
        timestamp: "2024-01-01T12:00:00Z",
      };

      const result = parseClaudeCodeMessage(input);

      expect(result.role).toBe("user");
      expect(result.content).toBe("Hello, can you help me?");
      expect(result.timestamp).toBe(new Date("2024-01-01T12:00:00Z").getTime());
    });

    it("should parse assistant message without tools", () => {
      const input: ClaudeCodeMessage = {
        type: "assistant",
        text: "Sure, I can help you!",
        timestamp: "2024-01-01T12:00:01Z",
      };

      const result = parseClaudeCodeMessage(input);

      expect(result.role).toBe("assistant");
      expect(result.content).toBe("Sure, I can help you!");
    });

    it("should parse assistant message with tool calls", () => {
      const input: ClaudeCodeMessage = {
        type: "assistant",
        text: "Let me read that file",
        timestamp: "2024-01-01T12:00:02Z",
        toolUse: [
          {
            id: "tool-1",
            name: "Read",
            input: { file_path: "/src/test.ts" },
          },
        ],
      };

      const result = parseClaudeCodeMessage(input);

      expect(result.role).toBe("assistant");
      expect(result.content).toBe("Let me read that file");
      expect("toolCalls" in result).toBe(true);
      if ("toolCalls" in result) {
        expect(result.toolCalls).toHaveLength(1);
        expect(result.toolCalls?.[0].name).toBe("Read");
        expect(result.toolCalls?.[0].arguments).toEqual({
          file_path: "/src/test.ts",
        });
      }
    });
  });

  describe("parseClaudeCodeConversation", () => {
    it("should parse a full conversation", () => {
      const input: ClaudeCodeMessage[] = [
        {
          type: "user",
          text: "Fix the bug",
          timestamp: "2024-01-01T12:00:00Z",
        },
        {
          type: "assistant",
          text: "I'll help fix it",
          timestamp: "2024-01-01T12:00:01Z",
        },
      ];

      const result = parseClaudeCodeConversation(input);

      expect(result).toHaveLength(2);
      expect(result[0].role).toBe("user");
      expect(result[1].role).toBe("assistant");
    });
  });

  describe("formatClaudeCodeMessageForDisplay", () => {
    it("should format user message", () => {
      const message = {
        role: "user" as const,
        content: "Hello",
      };

      const result = formatClaudeCodeMessageForDisplay(message);

      expect(result).toContain("👤 User: Hello");
    });

    it("should format assistant message with tool calls", () => {
      const message = {
        role: "assistant" as const,
        content: "Reading file",
        toolCalls: [
          {
            id: "tool-1",
            name: "Read",
            arguments: { file_path: "/test.ts" },
          },
        ],
      };

      const result = formatClaudeCodeMessageForDisplay(message);

      expect(result).toContain("🤖 Claude: Reading file");
      expect(result).toContain("🔧 Tool: Read");
      expect(result).toContain("file_path");
    });
  });
});
