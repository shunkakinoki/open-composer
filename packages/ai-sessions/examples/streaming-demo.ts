#!/usr/bin/env bun

/**
 * AI Sessions Streaming Demo
 *
 * This example demonstrates how to use the AI sessions streaming viewer
 * to display conversation logs from different AI agents.
 */

import {
  type Conversation,
  formatConversationForDisplay,
  parseClaudeCodeConversation,
  parseCursorConversation,
  parseCodexConversation,
  streamConversation,
} from "../src/index.js";

// Example Claude Code conversation
const claudeCodeMessages = [
  {
    type: "user" as const,
    text: "Can you help me refactor this authentication code?",
    timestamp: new Date("2024-01-01T10:00:00Z").toISOString(),
  },
  {
    type: "assistant" as const,
    text: "I'll help you refactor the authentication code. Let me first read the current implementation.",
    timestamp: new Date("2024-01-01T10:00:05Z").toISOString(),
    toolUse: [
      {
        id: "tool-1",
        name: "Read",
        input: { file_path: "/src/auth/authenticate.ts" },
      },
    ],
  },
  {
    type: "assistant" as const,
    text: "I can see several improvements we can make:\n1. Extract validation logic\n2. Add proper error handling\n3. Implement token refresh mechanism",
    timestamp: new Date("2024-01-01T10:00:15Z").toISOString(),
  },
];

const claudeCodeConversation: Conversation = {
  id: "claude-demo-1",
  agent: "claude-code",
  messages: parseClaudeCodeConversation(claudeCodeMessages),
  metadata: {
    repository: "github.com/user/auth-service",
    branch: "refactor/authentication",
    cwd: "/workspace/auth-service",
    timestamp: new Date("2024-01-01T10:00:00Z"),
  },
};

// Example Cursor conversation
const cursorMessages = [
  {
    role: "user" as const,
    content: "Add error handling to the API endpoint",
    createdAt: Date.now() - 3600000,
  },
  {
    role: "assistant" as const,
    content: "I'll add comprehensive error handling with try-catch blocks and proper HTTP status codes.",
    createdAt: Date.now() - 3500000,
  },
  {
    role: "assistant" as const,
    content: "I've added error handling with:\n- Try-catch for async operations\n- Custom error classes\n- HTTP 400/500 status codes\n- Error logging",
    createdAt: Date.now() - 3400000,
  },
];

const cursorConversation: Conversation = {
  id: "cursor-demo-1",
  agent: "cursor-agent",
  messages: parseCursorConversation(cursorMessages),
  metadata: {
    repository: "github.com/user/api-service",
    branch: "feature/error-handling",
    cwd: "/workspace/api-service",
    timestamp: new Date(Date.now() - 3600000),
  },
};

// Example Codex conversation
const codexMessages = [
  {
    type: "user_message" as const,
    payload: { message: "Create a new database migration for user roles" },
    timestamp: new Date("2024-01-01T14:00:00Z").toISOString(),
  },
  {
    type: "assistant_message" as const,
    payload: { message: "I'll create a migration file for user roles." },
    timestamp: new Date("2024-01-01T14:00:05Z").toISOString(),
  },
  {
    type: "tool_call" as const,
    payload: {
      tool_name: "Write",
      tool_args: {
        file_path: "/db/migrations/20240101_add_user_roles.sql",
        content: "CREATE TABLE user_roles...",
      },
    },
    timestamp: new Date("2024-01-01T14:00:10Z").toISOString(),
  },
  {
    type: "tool_result" as const,
    payload: {
      tool_name: "Write",
      result: "File created successfully",
    },
    timestamp: new Date("2024-01-01T14:00:12Z").toISOString(),
  },
];

const codexConversation: Conversation = {
  id: "codex-demo-1",
  agent: "codex",
  messages: parseCodexConversation(codexMessages),
  metadata: {
    repository: "github.com/user/database-service",
    branch: "feature/user-roles",
    cwd: "/workspace/database-service",
    timestamp: new Date("2024-01-01T14:00:00Z"),
  },
};

// Demo function
async function runDemo() {
  console.log("🎬 AI Sessions Streaming Demo\n");
  console.log("=" .repeat(80));
  console.log("\nDemo 1: Claude Code Conversation (Formatted Display)");
  console.log("=" .repeat(80));

  // Display Claude Code conversation
  const claudeOutput = formatConversationForDisplay(claudeCodeConversation);
  console.log(claudeOutput);

  console.log("\n" + "=".repeat(80));
  console.log("Demo 2: Cursor Conversation (Formatted Display)");
  console.log("=".repeat(80));

  // Display Cursor conversation
  const cursorOutput = formatConversationForDisplay(cursorConversation);
  console.log(cursorOutput);

  console.log("\n" + "=".repeat(80));
  console.log("Demo 3: Codex Conversation (Formatted Display)");
  console.log("=".repeat(80));

  // Display Codex conversation
  const codexOutput = formatConversationForDisplay(codexConversation);
  console.log(codexOutput);

  // Demo streaming with AI summary (requires API key)
  if (process.env.OPENROUTER_API_KEY) {
    console.log("\n" + "=".repeat(80));
    console.log("Demo 4: Streaming with AI Summary");
    console.log("=".repeat(80));

    console.log("\nStreaming Claude Code conversation with AI summary...\n");

    try {
      for await (const chunk of streamConversation(claudeCodeConversation, {
        useSummary: true,
        model: "openai:gpt-4o-mini",
        apiKey: process.env.OPENROUTER_API_KEY,
      })) {
        process.stdout.write(chunk);
      }
    } catch (error) {
      console.error("\n⚠️  Error during streaming:", error);
    }
  } else {
    console.log("\n" + "=".repeat(80));
    console.log("ℹ️  Set OPENROUTER_API_KEY to see AI-powered summaries");
    console.log("=".repeat(80));
  }

  console.log("\n\n✨ Demo completed!");
}

// Run the demo
if (import.meta.main) {
  runDemo().catch(console.error);
}
