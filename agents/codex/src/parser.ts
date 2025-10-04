// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type MessageRole = "user" | "assistant" | "system" | "tool";

export interface BaseMessage {
  role: MessageRole;
  content: string;
  timestamp?: number;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface AssistantMessage extends BaseMessage {
  role: "assistant";
  toolCalls?: ToolCall[];
}

export interface ToolMessage extends BaseMessage {
  role: "tool";
  toolCallId: string;
  toolName: string;
}

export type Message = BaseMessage | AssistantMessage | ToolMessage;

export interface CodexMessage {
  type: "user_message" | "assistant_message" | "tool_call" | "tool_result";
  payload: {
    message?: string;
    tool_name?: string;
    tool_args?: Record<string, unknown>;
    result?: string;
  };
  timestamp: string;
}

// -----------------------------------------------------------------------------
// Parsers
// -----------------------------------------------------------------------------

/**
 * Parse Codex message format to standard message format
 */
export function parseCodexMessage(msg: CodexMessage): Message | null {
  const timestamp = new Date(msg.timestamp).getTime();

  switch (msg.type) {
    case "user_message":
      return {
        role: "user",
        content: msg.payload.message || "",
        timestamp,
      };
    case "assistant_message":
      return {
        role: "assistant",
        content: msg.payload.message || "",
        timestamp,
      };
    case "tool_call":
      return {
        role: "assistant",
        content: `Calling tool: ${msg.payload.tool_name}`,
        timestamp,
        toolCalls: [
          {
            id: `tool-${timestamp}`,
            name: msg.payload.tool_name || "unknown",
            arguments: msg.payload.tool_args || {},
          },
        ],
      };
    case "tool_result": {
      const toolMsg: ToolMessage = {
        role: "tool",
        content: msg.payload.result || "",
        timestamp,
        toolCallId: `tool-${timestamp}`,
        toolName: msg.payload.tool_name || "unknown",
      };
      return toolMsg;
    }
    default:
      return null;
  }
}

/**
 * Parse Codex conversation to standard message array
 */
export function parseCodexConversation(messages: CodexMessage[]): Message[] {
  return messages.map(parseCodexMessage).filter((msg): msg is Message => msg !== null);
}

/**
 * Format message for streaming display
 */
export function formatCodexMessageForDisplay(msg: Message): string {
  let prefix = "🤖 Codex";
  if (msg.role === "user") {
    prefix = "👤 User";
  } else if (msg.role === "tool") {
    const toolMsg = msg as ToolMessage;
    return `🔧 Tool Result (${toolMsg.toolName}): ${msg.content}\n`;
  }

  let content = `${prefix}: ${msg.content}\n`;

  if ("toolCalls" in msg && msg.toolCalls) {
    for (const tool of msg.toolCalls) {
      content += `\n🔧 Tool: ${tool.name}\n`;
      content += `   Args: ${JSON.stringify(tool.arguments, null, 2)}\n`;
    }
  }

  return content;
}
