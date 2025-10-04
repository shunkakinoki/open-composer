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

export type Message = BaseMessage | AssistantMessage;

export interface ClaudeCodeMessage {
  type: "user" | "assistant";
  text: string;
  timestamp?: string;
  toolUse?: Array<{
    id: string;
    name: string;
    input: Record<string, unknown>;
  }>;
  toolResult?: Array<{
    toolUseId: string;
    content: string;
  }>;
}

// -----------------------------------------------------------------------------
// Parsers
// -----------------------------------------------------------------------------

/**
 * Parse Claude Code message format to standard message format
 */
export function parseClaudeCodeMessage(msg: ClaudeCodeMessage): Message {
  const role = msg.type === "user" ? "user" : "assistant";
  const timestamp = msg.timestamp ? new Date(msg.timestamp).getTime() : undefined;

  if (msg.type === "assistant" && msg.toolUse) {
    const assistantMsg: AssistantMessage = {
      role: "assistant",
      content: msg.text,
      timestamp,
      toolCalls: msg.toolUse.map((tool) => ({
        id: tool.id,
        name: tool.name,
        arguments: tool.input,
      })),
    };
    return assistantMsg;
  }

  return {
    role,
    content: msg.text,
    timestamp,
  };
}

/**
 * Parse Claude Code conversation to standard message array
 */
export function parseClaudeCodeConversation(
  messages: ClaudeCodeMessage[],
): Message[] {
  return messages.map(parseClaudeCodeMessage);
}

/**
 * Format message for streaming display
 */
export function formatClaudeCodeMessageForDisplay(msg: Message): string {
  const prefix = msg.role === "user" ? "👤 User" : "🤖 Claude";
  let content = `${prefix}: ${msg.content}\n`;

  if ("toolCalls" in msg && msg.toolCalls) {
    for (const tool of msg.toolCalls) {
      content += `\n🔧 Tool: ${tool.name}\n`;
      content += `   Args: ${JSON.stringify(tool.arguments, null, 2)}\n`;
    }
  }

  return content;
}
