import { Args, Command, Options } from "@effect/cli";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import {
  trackCommand,
  trackFeatureUsage,
} from "../services/telemetry-service.js";
import type { CommandBuilder } from "../types/commands.js";

// -----------------------------------------------------------------------------
// Command Builder
// -----------------------------------------------------------------------------

export const buildAISessionsViewerCommand =
  (): CommandBuilder<"ai-sessions-viewer"> => ({
    command: () =>
      Command.make("ai-sessions-viewer").pipe(
        Command.withDescription(
          "View AI session conversations with streaming support",
        ),
        Command.withSubcommands([buildViewCommand()]),
      ),
    metadata: {
      name: "ai-sessions-viewer",
      description: "View AI session conversations with streaming",
    },
  });

// -----------------------------------------------------------------------------
// Command Implementations
// -----------------------------------------------------------------------------

function buildViewCommand() {
  const sessionIdArg = Args.text({ name: "session-id" }).pipe(
    Args.withDescription("Session ID to view"),
  );

  const summaryOption = Options.boolean("summary").pipe(
    Options.withDefault(false),
    Options.withDescription("Generate AI-powered summary of the conversation"),
  );

  const modelOption = Options.text("model").pipe(
    Options.optional,
    Options.withDescription(
      "Model to use for summary (default: openai:gpt-4o-mini)",
    ),
  );

  return Command.make("view", {
    sessionId: sessionIdArg,
    summary: summaryOption,
    model: modelOption,
  }).pipe(
    Command.withDescription("View a specific AI session conversation"),
    Command.withHandler(({ sessionId, summary, model }) =>
      Effect.gen(function* () {
        yield* trackCommand("ai-sessions-viewer", "view");
        yield* trackFeatureUsage("ai_sessions_viewer_view", {
          with_summary: summary,
          has_custom_model: Option.isSome(model),
        });

        const { AISessionsService, streamConversation } = yield* Effect.promise(
          () => import("@open-composer/ai-sessions"),
        );

        const service = new AISessionsService();
        const sessions = yield* service.getAllSessions();

        // Find the session
        const session = sessions.find((s) => s.id === sessionId);
        if (!session) {
          console.error(`Session not found: ${sessionId}`);
          return;
        }

        console.log(`\n🔍 Loading session: ${sessionId}\n`);

        // For demo purposes, create mock messages based on agent type
        // In production, these would be fetched from actual storage
        const mockMessages = getMockMessagesForAgent(session.agent);

        // Create conversation object
        const { getConversationFromSession } = yield* Effect.promise(
          () => import("@open-composer/ai-sessions"),
        );

        const conversation = yield* getConversationFromSession(
          session,
          mockMessages,
        );

        // Stream the conversation
        const modelValue = Option.getOrElse(model, () => "openai:gpt-4o-mini");
        const streamOptions = {
          useSummary: summary,
          model: modelValue,
        };

        yield* Effect.promise(async () => {
          try {
            for await (const chunk of streamConversation(
              conversation,
              streamOptions,
            )) {
              process.stdout.write(chunk);
            }
          } catch (error) {
            console.error(
              `\n❌ Error streaming conversation: ${error instanceof Error ? error.message : String(error)}`,
            );
          }
        });
      }),
    ),
  );
}

// Helper function to generate mock messages for demo
function getMockMessagesForAgent(agent: string): unknown[] {
  switch (agent) {
    case "claude-code":
      return [
        {
          type: "user",
          text: "Can you help me fix the bug in auth.ts?",
          timestamp: new Date().toISOString(),
        },
        {
          type: "assistant",
          text: "I'll help you fix the authentication bug. Let me read the file first.",
          timestamp: new Date().toISOString(),
          toolUse: [
            {
              id: "tool-1",
              name: "Read",
              input: { file_path: "/src/auth.ts" },
            },
          ],
        },
        {
          type: "assistant",
          text: "I found the issue. The token validation is missing a null check. I'll fix it now.",
          timestamp: new Date().toISOString(),
        },
      ];
    case "cursor":
    case "cursor-agent":
      return [
        {
          role: "user",
          content: "Add error handling to the API endpoint",
          createdAt: Date.now(),
        },
        {
          role: "assistant",
          content:
            "I'll add comprehensive error handling with try-catch blocks and proper error responses.",
          createdAt: Date.now(),
        },
      ];
    case "codex":
      return [
        {
          type: "user_message",
          payload: { message: "Refactor the database connection code" },
          timestamp: new Date().toISOString(),
        },
        {
          type: "assistant_message",
          payload: {
            message:
              "I'll refactor the database connection to use a connection pool pattern.",
          },
          timestamp: new Date().toISOString(),
        },
      ];
    case "opencode":
      return [
        {
          role: "user",
          content: "Create a new React component for the dashboard",
          timestamp: Date.now(),
        },
        {
          role: "assistant",
          content:
            "I'll create a responsive dashboard component using React hooks and TypeScript.",
          timestamp: Date.now(),
        },
      ];
    default:
      return [];
  }
}
