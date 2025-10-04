import { describe, expect, test } from "bun:test";
import type {
  AssistantMessage,
  BaseMessage,
  Message,
  MessageRole,
  ToolCall,
  ToolMessage,
} from "../streaming-types.js";

describe("streaming-types", () => {
  describe("MessageRole", () => {
    test("should have correct role values", () => {
      const roles: MessageRole[] = ["user", "assistant", "system", "tool"];
      expect(roles).toHaveLength(4);
    });
  });

  describe("BaseMessage", () => {
    test("should create valid base message", () => {
      const message: BaseMessage = {
        role: "user",
        content: "Hello",
        timestamp: Date.now(),
      };
      expect(message.role).toBe("user");
      expect(message.content).toBe("Hello");
      expect(message.timestamp).toBeNumber();
    });

    test("should allow optional timestamp", () => {
      const message: BaseMessage = {
        role: "assistant",
        content: "Hi there",
      };
      expect(message.timestamp).toBeUndefined();
    });
  });

  describe("ToolCall", () => {
    test("should create valid tool call", () => {
      const toolCall: ToolCall = {
        id: "tool-123",
        name: "read_file",
        arguments: { path: "/foo/bar.txt" },
      };
      expect(toolCall.id).toBe("tool-123");
      expect(toolCall.name).toBe("read_file");
      expect(toolCall.arguments).toEqual({ path: "/foo/bar.txt" });
    });
  });

  describe("AssistantMessage", () => {
    test("should create assistant message without tool calls", () => {
      const message: AssistantMessage = {
        role: "assistant",
        content: "I can help with that",
      };
      expect(message.role).toBe("assistant");
      expect(message.toolCalls).toBeUndefined();
    });

    test("should create assistant message with tool calls", () => {
      const message: AssistantMessage = {
        role: "assistant",
        content: "Let me read that file",
        toolCalls: [
          {
            id: "tool-1",
            name: "read_file",
            arguments: { path: "/test.txt" },
          },
        ],
      };
      expect(message.toolCalls).toHaveLength(1);
      expect(message.toolCalls?.[0].name).toBe("read_file");
    });
  });

  describe("ToolMessage", () => {
    test("should create valid tool message", () => {
      const message: ToolMessage = {
        role: "tool",
        content: "File contents here",
        toolCallId: "tool-123",
        toolName: "read_file",
      };
      expect(message.role).toBe("tool");
      expect(message.toolCallId).toBe("tool-123");
      expect(message.toolName).toBe("read_file");
    });
  });

  describe("Message union type", () => {
    test("should accept BaseMessage", () => {
      const message: Message = {
        role: "user",
        content: "Test",
      };
      expect(message.role).toBe("user");
    });

    test("should accept AssistantMessage", () => {
      const message: Message = {
        role: "assistant",
        content: "Response",
        toolCalls: [],
      };
      expect(message.role).toBe("assistant");
    });

    test("should accept ToolMessage", () => {
      const message: Message = {
        role: "tool",
        content: "Result",
        toolCallId: "123",
        toolName: "test",
      };
      expect(message.role).toBe("tool");
    });
  });
});
