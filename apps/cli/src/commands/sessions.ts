import { Args, Command } from "@effect/cli";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import { SessionsCli } from "../services/sessions-cli.js";
import { trackCommand, trackFeatureUsage } from "../services/telemetry.js";

function buildCreateCommand() {
  const nameArg = Args.text({ name: "name" }).pipe(
    Args.optional,
    Args.withDescription(
      "Name of the new session (optional, will prompt if not provided)",
    ),
  );
  return Command.make("create", { name: nameArg }).pipe(
    Command.withDescription("Create and start a new development session"),
    Command.withHandler((config) =>
      Effect.gen(function* () {
        yield* trackCommand("sessions", "create");
        yield* trackFeatureUsage("sessions_create");

        const providedName = Option.getOrUndefined(config.name);

        if (providedName) {
          // If name is provided, use the traditional CLI approach
          const cli = new SessionsCli();
          yield* cli.create(providedName);
        } else {
          // If no name provided, use the interactive React component
          return yield* Effect.tryPromise({
            try: async () => {
              const { render } = await import("ink");
              const React = await import("react");
              const { SessionCreatePrompt } = await import(
                "../components/SessionCreatePrompt.js"
              );

              const { waitUntilExit } = render(
                React.createElement(SessionCreatePrompt, {
                  onComplete: (sessionId: number) => {
                    console.log(`✅ Created session with ID: ${sessionId}`);
                  },
                  onCancel: () => {
                    console.log("❌ Session creation cancelled");
                    process.exit(0);
                  },
                }),
              );
              await waitUntilExit();
            },
            catch: (error) =>
              new Error(
                `Failed to start interactive session creation: ${
                  error instanceof Error ? error.message : String(error)
                }`,
              ),
          });
        }
      }),
    ),
  );
}

function buildListCommand() {
  return Command.make("list").pipe(
    Command.withDescription("List all development sessions"),
    Command.withHandler(() =>
      Effect.gen(function* () {
        yield* trackCommand("sessions", "list");
        yield* trackFeatureUsage("sessions_list");

        const cli = new SessionsCli();
        yield* cli.list();
      }),
    ),
  );
}

function buildSwitchCommand() {
  const sessionIdArg = Args.integer({ name: "session-id" }).pipe(
    Args.withDescription("ID of the session to switch to"),
  );
  return Command.make("switch", { sessionId: sessionIdArg }).pipe(
    Command.withDescription("Switch to a different session"),
    Command.withHandler((config) =>
      Effect.gen(function* () {
        yield* trackCommand("sessions", "switch");
        yield* trackFeatureUsage("sessions_switch");

        const cli = new SessionsCli();
        yield* cli.switch(config.sessionId);
      }),
    ),
  );
}

function buildArchiveCommand() {
  const sessionIdArg = Args.integer({ name: "session-id" }).pipe(
    Args.withDescription("ID of the session to archive"),
  );
  return Command.make("archive", { sessionId: sessionIdArg }).pipe(
    Command.withDescription("Archive a session"),
    Command.withHandler((config) =>
      Effect.gen(function* () {
        yield* trackCommand("sessions", "archive");
        yield* trackFeatureUsage("sessions_archive");

        const cli = new SessionsCli();
        yield* cli.archive(config.sessionId);
      }),
    ),
  );
}

function buildDeleteCommand() {
  const sessionIdArg = Args.integer({ name: "session-id" }).pipe(
    Args.withDescription("ID of the session to delete"),
  );
  return Command.make("delete", { sessionId: sessionIdArg }).pipe(
    Command.withDescription("Delete a session permanently"),
    Command.withHandler((config) =>
      Effect.gen(function* () {
        yield* trackCommand("sessions", "delete");
        yield* trackFeatureUsage("sessions_delete");

        const cli = new SessionsCli();
        yield* cli.delete(config.sessionId);
      }),
    ),
  );
}

export const buildSessionsCommand = () =>
  Command.make("sessions").pipe(
    Command.withDescription("Manage development sessions"),
    Command.withSubcommands([
      buildCreateCommand(),
      buildListCommand(),
      buildSwitchCommand(),
      buildArchiveCommand(),
      buildDeleteCommand(),
    ]),
  );
