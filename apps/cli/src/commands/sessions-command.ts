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

export const buildSessionsCommand = (): CommandBuilder<"sessions"> => ({
  command: () =>
    Command.make("sessions").pipe(
      Command.withDescription(
        "View all AI agent sessions (Codex, Cursor, Claude Code)",
      ),
      Command.withSubcommands([buildListCommand()]),
    ),
  metadata: {
    name: "sessions",
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
        yield* trackCommand("sessions", "list");
        yield* trackFeatureUsage("sessions_list");

        return yield* Effect.tryPromise({
          try: async () => {
            const [{ render }, React, { AgentSessionsList }] = await Promise.all([
              import("ink"),
              import("react"),
              import("../components/AgentSessionsList.js"),
            ]);

            return new Promise<void>((resolve, reject) => {
              const { waitUntilExit } = render(
                React.createElement(AgentSessionsList, {
                  onComplete: () => {
                    resolve();
                  },
                  onCancel: () => {
                    reject(new Error("Agent sessions list cancelled by user"));
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
