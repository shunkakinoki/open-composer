// -----------------------------------------------------------------------------
// Streaming Message Types
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

// -----------------------------------------------------------------------------
// Agent-specific Message Formats
// -----------------------------------------------------------------------------

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

export interface CursorMessage {
  role: "user" | "assistant" | "system";
  content: string;
  createdAt?: number;
}

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

export interface OpencodeMessage {
  role: "user" | "assistant";
  content: string;
  timestamp?: number;
}

// -----------------------------------------------------------------------------
// Conversation Format
// -----------------------------------------------------------------------------

export interface Conversation {
  id: string;
  agent: "codex" | "cursor" | "cursor-agent" | "claude-code" | "opencode";
  messages: Message[];
  metadata?: {
    cwd?: string;
    repository?: string;
    branch?: string;
    timestamp: Date;
  };
}

// -----------------------------------------------------------------------------
// Streaming Response Format
// -----------------------------------------------------------------------------

export interface StreamChunk {
  type: "message" | "tool" | "error" | "metadata";
  content: string;
  metadata?: Record<string, unknown>;
}
