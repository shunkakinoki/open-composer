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

export interface CursorMessage {
  role: "user" | "assistant" | "system";
  content: string;
  createdAt?: number;
}

// -----------------------------------------------------------------------------
// Parsers
// -----------------------------------------------------------------------------

/**
 * Parse Cursor message format to standard message format
 */
export function parseCursorMessage(msg: CursorMessage): Message {
  return {
    role: msg.role as "user" | "assistant" | "system",
    content: msg.content,
    timestamp: msg.createdAt,
  };
}

/**
 * Parse Cursor conversation to standard message array
 */
export function parseCursorConversation(messages: CursorMessage[]): Message[] {
  return messages.map(parseCursorMessage);
}

/**
 * Format message for streaming display
 */
export function formatCursorMessageForDisplay(msg: Message): string {
  let prefix = "🤖 Cursor";
  if (msg.role === "user") {
    prefix = "👤 User";
  } else if (msg.role === "system") {
    prefix = "⚙️  System";
  }
  return `${prefix}: ${msg.content}\n`;
}
