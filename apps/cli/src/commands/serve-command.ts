import { Command, Options } from "@effect/cli";
import * as Effect from "effect/Effect";
import {
  trackCommand,
  trackFeatureUsage,
} from "../services/telemetry-service.js";
import type { CommandBuilder } from "../types/commands.js";
import * as path from "node:path";

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

        console.log(`🚀 Starting OpenComposer PTY Server on port ${portValue}...`);

        // Get the server package directory
        // Assuming the CLI is in apps/cli and server is in apps/server
        const cliDir = import.meta.dir;
        const appsDir = path.resolve(cliDir, "../../..");
        const serverDir = path.join(appsDir, "apps/server");
        const serverEntry = path.join(serverDir, "src/index.ts");

        console.log(`📦 Server directory: ${serverDir}`);
        console.log(`📄 Server entry: ${serverEntry}`);

        // Run the server with Bun
        const proc = Bun.spawn(
          ["bun", "run", serverEntry, "--port", portValue.toString()],
          {
            cwd: serverDir,
            stdio: ["inherit", "inherit", "inherit"],
            env: {
              ...process.env,
            },
          },
        );

        // Wait for the process to exit using Effect
        const exitCode = yield* Effect.promise(() => proc.exited);

        if (exitCode !== 0) {
          console.error(`❌ Server exited with code ${exitCode}`);
          return yield* Effect.fail(new Error(`Server exited with code ${exitCode}`));
        }

        return undefined;
      }),
    ),
  );
}
