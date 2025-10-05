import { Command } from "@effect/cli";
import * as Effect from "effect/Effect";
import {
  trackCommand,
  trackFeatureUsage,
} from "../services/telemetry-service.js";
import type { CommandBuilder } from "../types/commands.js";

// -----------------------------------------------------------------------------
// Command Builder
// -----------------------------------------------------------------------------

export const buildAISessionsCommand = (): CommandBuilder<"ai-sessions"> => ({
  command: () =>
    Command.make("ai-sessions").pipe(
      Command.withDescription(
        "View all AI agent sessions (Codex, Cursor, Claude Code)",
      ),
      Command.withSubcommands([buildListCommand()]),
    ),
  metadata: {
    name: "ai-sessions",
    description: "View all AI agent sessions",
  },
});

// -----------------------------------------------------------------------------
// Command Implementations
// -----------------------------------------------------------------------------

function buildListCommand() {
  return Command.make("list").pipe(
    Command.withDescription("List all AI agent sessions from all sources"),
    Command.withHandler(() =>
      Effect.gen(function* () {
        yield* trackCommand("ai-sessions", "list");
        yield* trackFeatureUsage("ai_sessions_list");

        return yield* Effect.tryPromise({
          try: async () => {
            const [{ render }, React, { AISessionsList }] = await Promise.all([
              import("ink"),
              import("react"),
              import("../components/AISessionsList.js"),
            ]);

            return new Promise<void>((resolve, reject) => {
              const { waitUntilExit } = render(
                React.createElement(AISessionsList, {
                  onComplete: () => {
                    resolve();
                  },
                  onCancel: () => {
                    reject(new Error("AI sessions list cancelled by user"));
                  },
                }),
                {
                  exitOnCtrlC: true,
                  patchConsole: false,
                },
              );
              waitUntilExit().catch(reject);
            });
          },
          catch: (error) => {
            if (
              error instanceof Error &&
              error.message === "AI sessions list cancelled by user"
            ) {
              return error;
            }
            return new Error(
              `Failed to display AI sessions: ${
                error instanceof Error ? error.message : String(error)
              }`,
            );
          },
        });
      }),
    ),
  );
}
