// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type MessageRole = "user" | "assistant" | "system" | "tool";

export interface BaseMessage {
  role: MessageRole;
  content: string;
  timestamp?: number;
}

export type Message = BaseMessage;

export interface OpencodeMessage {
  role: "user" | "assistant";
  content: string;
  timestamp?: number;
}

// -----------------------------------------------------------------------------
// Parsers
// -----------------------------------------------------------------------------

/**
 * Parse Opencode message format to standard message format
 */
export function parseOpencodeMessage(msg: OpencodeMessage): Message {
  return {
    role: msg.role as "user" | "assistant",
    content: msg.content,
    timestamp: msg.timestamp,
  };
}

/**
 * Parse Opencode conversation to standard message array
 */
export function parseOpencodeConversation(messages: OpencodeMessage[]): Message[] {
  return messages.map(parseOpencodeMessage);
}

/**
 * Format message for streaming display
 */
export function formatOpencodeMessageForDisplay(msg: Message): string {
  const prefix = msg.role === "user" ? "👤 User" : "🤖 Opencode";
  return `${prefix}: ${msg.content}\n`;
}
