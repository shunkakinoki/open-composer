import { streamText, type CoreMessage } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import * as Effect from "effect/Effect";
import type { AISession } from "./types.js";
import type { Message, Conversation } from "./streaming-types.js";
import {
  parseClaudeCodeConversation,
  formatClaudeCodeMessageForDisplay,
} from "@open-composer/agent-claude-code";
import {
  parseCursorConversation,
  formatCursorMessageForDisplay,
} from "@open-composer/agent-cursor";
import {
  parseCodexConversation,
  formatCodexMessageForDisplay,
} from "@open-composer/agent-codex";
import {
  parseOpencodeConversation,
  formatOpencodeMessageForDisplay,
} from "@open-composer/agent-opencode";

// -----------------------------------------------------------------------------
// Streaming Viewer Service
// -----------------------------------------------------------------------------

export interface StreamingViewerOptions {
  /**
   * Whether to use AI to summarize the conversation
   */
  useSummary?: boolean;

  /**
   * Model to use for summarization
   */
  model?: string;

  /**
   * OpenRouter API key for summarization
   */
  apiKey?: string;
}

/**
 * Format a conversation for display
 */
export function formatConversationForDisplay(
  conversation: Conversation,
): string {
  const { agent, messages, metadata } = conversation;

  let output = `\n${"=".repeat(80)}\n`;
  output += `Agent: ${agent}\n`;
  if (metadata?.repository) output += `Repository: ${metadata.repository}\n`;
  if (metadata?.branch) output += `Branch: ${metadata.branch}\n`;
  if (metadata?.cwd) output += `Working Directory: ${metadata.cwd}\n`;
  output += `Timestamp: ${metadata?.timestamp.toISOString()}\n`;
  output += `${"=".repeat(80)}\n\n`;

  for (const msg of messages) {
    switch (agent) {
      case "claude-code":
        output += formatClaudeCodeMessageForDisplay(msg);
        break;
      case "cursor":
      case "cursor-agent":
        output += formatCursorMessageForDisplay(msg);
        break;
      case "codex":
        output += formatCodexMessageForDisplay(msg);
        break;
      case "opencode":
        output += formatOpencodeMessageForDisplay(msg);
        break;
      default:
        output += `${msg.role}: ${msg.content}\n`;
    }
    output += "\n";
  }

  return output;
}

/**
 * Stream a conversation with AI-powered summarization
 */
export async function* streamConversation(
  conversation: Conversation,
  options: StreamingViewerOptions = {},
): AsyncGenerator<string> {
  // First, yield the formatted conversation
  yield formatConversationForDisplay(conversation);

  // If summary is requested, generate it using AI SDK
  if (options.useSummary) {
    const apiKey =
      options.apiKey ||
      (typeof process !== "undefined" ? process.env?.OPENROUTER_API_KEY : undefined);

    if (!apiKey) {
      yield "\n⚠️  Summary requested but no API key provided\n";
      return;
    }

    const model =
      options.model || "openai:gpt-4o-mini";

    try {
      const provider = createOpenAI({
        apiKey,
        baseURL: "https://openrouter.ai/api/v1",
      });

      const [_providerName, ...modelParts] = model.split(":");
      const modelName = modelParts.join(":");

      // Convert conversation to CoreMessage format
      const coreMessages: CoreMessage[] = conversation.messages.map((msg) => ({
        role: msg.role === "tool" ? "assistant" : msg.role,
        content: msg.content,
      }));

      const summaryPrompt: CoreMessage = {
        role: "user",
        content: `Please provide a concise summary of this conversation in 2-3 sentences. Focus on the main task, key decisions, and outcomes.`,
      };

      yield "\n\n📝 **Summary**\n\n";

      const result = streamText({
        model: provider(modelName) as any,
        messages: [...coreMessages, summaryPrompt],
        temperature: 0.3,
      });

      for await (const chunk of result.textStream) {
        yield chunk;
      }

      yield "\n";
    } catch (error) {
      yield `\n⚠️  Error generating summary: ${error instanceof Error ? error.message : String(error)}\n`;
    }
  }
}

/**
 * Get conversation from session (needs to fetch actual messages from storage)
 */
export function getConversationFromSession(
  session: AISession,
  messages: unknown[],
): Effect.Effect<Conversation, Error> {
  return Effect.try({
    try: () => {
      let parsedMessages: Message[] = [];

      switch (session.agent) {
        case "claude-code":
          parsedMessages = parseClaudeCodeConversation(messages as any);
          break;
        case "cursor":
        case "cursor-agent":
          parsedMessages = parseCursorConversation(messages as any);
          break;
        case "codex":
          parsedMessages = parseCodexConversation(messages as any);
          break;
        case "opencode":
          parsedMessages = parseOpencodeConversation(messages as any);
          break;
        default:
          throw new Error(`Unknown agent type: ${session.agent}`);
      }

      const conversation: Conversation = {
        id: session.id,
        agent: session.agent,
        messages: parsedMessages,
        metadata: {
          cwd: session.cwd,
          repository: session.repository,
          branch: session.branch,
          timestamp: session.timestamp,
        },
      };

      return conversation;
    },
    catch: (error) =>
      new Error(
        `Failed to parse conversation: ${error instanceof Error ? error.message : String(error)}`,
      ),
  });
}
