import { Command, Options } from "@effect/cli";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import { render } from "ink";
import React from "react";
import { Terminal } from "../components/Terminal.js";
import {
  trackCommand,
  trackFeatureUsage,
} from "../services/telemetry-service.js";
import type { CommandBuilder } from "../types/commands.js";

// -----------------------------------------------------------------------------
// Command Builder
// -----------------------------------------------------------------------------

export function buildTerminalCommand(): CommandBuilder<"terminal"> {
  const serverOption = Options.text("server").pipe(
    Options.withDefault("http://localhost:3000"),
    Options.withDescription(
      "Server URL (default: http://localhost:3000)"
    ),
  );

  const sessionOption = Options.text("session").pipe(
    Options.withDefault("default"),
    Options.withDescription("Session ID (default: default)"),
  );

  const shellOption = Options.text("shell").pipe(
    Options.optional,
    Options.withDescription(
      "Shell to launch (default: $SHELL or /bin/bash)"
    ),
  );

  const cwdOption = Options.text("cwd").pipe(
    Options.optional,
    Options.withDescription("Working directory (default: current directory)"),
  );

  const command = () =>
    Command.make("terminal", {
      server: serverOption,
      session: sessionOption,
      shell: shellOption,
      cwd: cwdOption,
    }).pipe(
      Command.withDescription(
        "Launch an interactive terminal that connects to the PTY server"
      ),
      Command.withHandler((config) =>
        Effect.gen(function* () {
          yield* trackCommand("terminal");
          yield* trackFeatureUsage("terminal_launch", {
            server: config.server,
            session: config.session,
          });

          return yield* Effect.tryPromise({
            try: async () => {
              const cmd = Option.isSome(config.shell)
                ? [config.shell.value]
                : [process.env.SHELL || "/bin/bash"];

              const cwd = Option.isSome(config.cwd)
                ? config.cwd.value
                : process.cwd();

              const { waitUntilExit } = render(
                React.createElement(Terminal, {
                  serverUrl: config.server,
                  sessionId: config.session,
                  cmd,
                  cwd,
                  onExit: (code) => {
                    process.exit(code);
                  },
                })
              );

              await waitUntilExit();
            },
            catch: (error) =>
              new Error(
                `Failed to start terminal: ${
                  error instanceof Error ? error.message : String(error)
                }`
              ),
          });
        })
      )
    );

  return {
    command,
    metadata: {
      name: "terminal",
      description: "Launch an interactive terminal that connects to the PTY server",
    },
  };
}
