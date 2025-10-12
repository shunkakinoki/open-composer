import { Command, Options } from "@effect/cli";
import * as Effect from "effect/Effect";
import {
  trackCommand,
  trackFeatureUsage,
} from "../services/telemetry-service.js";
import type { CommandBuilder } from "../types/commands.js";
import { startServer } from "@open-composer/server/server";

// -----------------------------------------------------------------------------
// Command Builder
// -----------------------------------------------------------------------------

export function buildServeCommand(): CommandBuilder<"serve"> {
  const command = () =>
    Command.make("serve").pipe(
      Command.withDescription("Start the OpenComposer PTY server"),
      Command.withSubcommands([buildStartCommand()]),
    );

  return {
    command,
    metadata: {
      name: "serve",
      description: "Start the OpenComposer PTY server",
    },
  };
}

// -----------------------------------------------------------------------------
// Command Implementations
// -----------------------------------------------------------------------------

export function buildStartCommand() {
  const portOption = Options.integer("port").pipe(
    Options.withDefault(3000),
    Options.withDescription("Port to run the server on (default: 3000)"),
  );

  return Command.make("start", { port: portOption }).pipe(
    Command.withDescription("Start the PTY server"),
    Command.withHandler((config) =>
      Effect.gen(function* () {
        const portValue = config.port;

        yield* trackCommand("serve", "start");
        yield* trackFeatureUsage("serve_start", {
          port: portValue,
        });

        // Start the server using the exported function
        startServer({ port: portValue });

        // Server is running - wait indefinitely
        yield* Effect.never;

        return undefined;
      }),
    ),
  );
}
