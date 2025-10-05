import { describe, expect, it } from "bun:test";
import {
  formatCodexMessageForDisplay,
  parseCodexConversation,
  parseCodexMessage,
} from "../parser.js";
import type { CodexMessage } from "../parser.js";

describe("Codex Parser", () => {
  describe("parseCodexMessage", () => {
    it("should parse user message", () => {
      const input: CodexMessage = {
        type: "user_message",
        payload: { message: "Refactor this code" },
        timestamp: "2024-01-01T12:00:00Z",
      };

      const result = parseCodexMessage(input);

      expect(result).not.toBeNull();
      expect(result?.role).toBe("user");
      expect(result?.content).toBe("Refactor this code");
    });

    it("should parse assistant message", () => {
      const input: CodexMessage = {
        type: "assistant_message",
        payload: { message: "I'll refactor it now" },
        timestamp: "2024-01-01T12:00:01Z",
      };

      const result = parseCodexMessage(input);

      expect(result).not.toBeNull();
      expect(result?.role).toBe("assistant");
      expect(result?.content).toBe("I'll refactor it now");
    });

    it("should parse tool call", () => {
      const input: CodexMessage = {
        type: "tool_call",
        payload: {
          tool_name: "Edit",
          tool_args: { file_path: "/test.ts", content: "new code" },
        },
        timestamp: "2024-01-01T12:00:02Z",
      };

      const result = parseCodexMessage(input);

      expect(result).not.toBeNull();
      expect(result?.role).toBe("assistant");
      expect(result?.content).toContain("Edit");
      if ("toolCalls" in result! && result!.toolCalls) {
        expect(result.toolCalls[0].name).toBe("Edit");
        expect(result.toolCalls[0].arguments).toEqual({
          file_path: "/test.ts",
          content: "new code",
        });
      }
    });

    it("should parse tool result", () => {
      const input: CodexMessage = {
        type: "tool_result",
        payload: {
          tool_name: "Read",
          result: "File contents here",
        },
        timestamp: "2024-01-01T12:00:03Z",
      };

      const result = parseCodexMessage(input);

      expect(result).not.toBeNull();
      expect(result?.role).toBe("tool");
      expect(result?.content).toBe("File contents here");
    });

    it("should return null for unknown message type", () => {
      const input: CodexMessage = {
        type: "unknown_type" as any,
        payload: {},
        timestamp: "2024-01-01T12:00:04Z",
      };

      const result = parseCodexMessage(input);

      expect(result).toBeNull();
    });
  });

  describe("parseCodexConversation", () => {
    it("should parse a full conversation and filter nulls", () => {
      const input: CodexMessage[] = [
        {
          type: "user_message",
          payload: { message: "Test" },
          timestamp: "2024-01-01T12:00:00Z",
        },
        {
          type: "unknown_type" as any,
          payload: {},
          timestamp: "2024-01-01T12:00:01Z",
        },
        {
          type: "assistant_message",
          payload: { message: "Response" },
          timestamp: "2024-01-01T12:00:02Z",
        },
      ];

      const result = parseCodexConversation(input);

      expect(result).toHaveLength(2);
      expect(result[0].role).toBe("user");
      expect(result[1].role).toBe("assistant");
    });
  });

  describe("formatCodexMessageForDisplay", () => {
    it("should format user message", () => {
      const message = {
        role: "user" as const,
        content: "Hello",
      };

      const result = formatCodexMessageForDisplay(message);

      expect(result).toContain("👤 User: Hello");
    });

    it("should format assistant message", () => {
      const message = {
        role: "assistant" as const,
        content: "Hi",
      };

      const result = formatCodexMessageForDisplay(message);

      expect(result).toContain("🤖 Codex: Hi");
    });

    it("should format tool result message", () => {
      const message = {
        role: "tool" as const,
        content: "File read successfully",
        toolCallId: "tool-1",
        toolName: "Read",
      };

      const result = formatCodexMessageForDisplay(message);

      expect(result).toContain("🔧 Tool Result (Read)");
      expect(result).toContain("File read successfully");
    });
  });
});
