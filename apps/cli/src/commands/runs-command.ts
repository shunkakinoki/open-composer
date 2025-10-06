import { Args, Command } from "@effect/cli";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import { RunsService } from "../services/runs-service.js";
import {
  trackCommand,
  trackFeatureUsage,
} from "../services/telemetry-service.js";
import type { CommandBuilder } from "../types/commands.js";

// -----------------------------------------------------------------------------
// Command Builder
// -----------------------------------------------------------------------------

export const buildRunsCommand = (): CommandBuilder<"runs"> => ({
  command: () =>
    Command.make("runs").pipe(
      Command.withDescription("Manage development runs"),
      Command.withSubcommands([
        buildCreateCommand(),
        buildListCommand(),
        buildSwitchCommand(),
        buildArchiveCommand(),
        buildDeleteCommand(),
      ]),
    ),
  metadata: {
    name: "runs",
    description: "Manage development runs",
  },
});

// -----------------------------------------------------------------------------
// Command Implementations
// -----------------------------------------------------------------------------

function buildCreateCommand() {
  const nameArg = Args.text({ name: "name" }).pipe(
    Args.optional,
    Args.withDescription(
      "Name of the new run (optional, will prompt if not provided)",
    ),
  );
  return Command.make("create", { name: nameArg }).pipe(
    Command.withDescription("Create and start a new development run"),
    Command.withHandler((config) =>
      Effect.gen(function* () {
        yield* trackCommand("runs", "create");
        yield* trackFeatureUsage("runs_create");

        const providedName = Option.getOrUndefined(config.name);

        if (providedName) {
          // If name is provided, use the traditional CLI approach
          const cli = new RunsService();
          yield* cli.create(providedName);
        } else {
          // If no name provided, use the interactive React component
          const runId = yield* Effect.tryPromise({
            try: async () => {
              const [{ render }, React, { RunCreatePrompt }] =
                await Promise.all([
                  import("ink"),
                  import("react"),
                  import("../components/RunCreatePrompt.js"),
                ]);

              return new Promise<number>((resolve, reject) => {
                const { waitUntilExit } = render(
                  React.createElement(RunCreatePrompt, {
                    onComplete: (id: number) => {
                      resolve(id);
                    },
                    onCancel: () => {
                      reject(new Error("Run creation cancelled by user"));
                    },
                  }),
                );
                waitUntilExit().catch(reject);
              });
            },
            catch: (error) => {
              if (
                error instanceof Error &&
                error.message === "Run creation cancelled by user"
              ) {
                return error;
              }
              return new Error(
                `Failed to start interactive run creation: ${
                  error instanceof Error ? error.message : String(error)
                }`,
              );
            },
          });

          console.log(`✅ Created run with ID: ${runId}`);
        }
      }),
    ),
  );
}

// -----------------------------------------------------------------------------
// Command Implementations
// -----------------------------------------------------------------------------

function buildListCommand() {
  return Command.make("list").pipe(
    Command.withDescription("List all development runs"),
    Command.withHandler(() =>
      Effect.gen(function* () {
        yield* trackCommand("runs", "list");
        yield* trackFeatureUsage("runs_list");

        const cli = new RunsService();
        yield* cli.list();
      }),
    ),
  );
}

function buildSwitchCommand() {
  const runIdArg = Args.integer({ name: "run-id" }).pipe(
    Args.withDescription("ID of the run to switch to"),
  );
  return Command.make("switch", { runId: runIdArg }).pipe(
    Command.withDescription("Switch to a different run"),
    Command.withHandler((config) =>
      Effect.gen(function* () {
        yield* trackCommand("runs", "switch");
        yield* trackFeatureUsage("runs_switch");

        const cli = new RunsService();
        yield* cli.switch(config.runId);
      }),
    ),
  );
}

function buildArchiveCommand() {
  const runIdArg = Args.integer({ name: "run-id" }).pipe(
    Args.withDescription("ID of the run to archive"),
  );
  return Command.make("archive", { runId: runIdArg }).pipe(
    Command.withDescription("Archive a run"),
    Command.withHandler((config) =>
      Effect.gen(function* () {
        yield* trackCommand("runs", "archive");
        yield* trackFeatureUsage("runs_archive");

        const cli = new RunsService();
        yield* cli.archive(config.runId);
      }),
    ),
  );
}

function buildDeleteCommand() {
  const runIdArg = Args.integer({ name: "run-id" }).pipe(
    Args.withDescription("ID of the run to delete"),
  );
  return Command.make("delete", { runId: runIdArg }).pipe(
    Command.withDescription("Delete a run permanently"),
    Command.withHandler((config) =>
      Effect.gen(function* () {
        yield* trackCommand("runs", "delete");
        yield* trackFeatureUsage("runs_delete");

        const cli = new RunsService();
        yield* cli.delete(config.runId);
      }),
    ),
  );
}
