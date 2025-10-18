import { Command, Options } from "@effect/cli";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import { render } from "ink";
import React from "react";
import { Terminal } from "@open-composer/terminal";
import {
  trackCommand,
  trackFeatureUsage,
} from "../services/telemetry-service.js";
import type { CommandBuilder } from "../types/commands.js";

// -----------------------------------------------------------------------------
// Command Options
// -----------------------------------------------------------------------------

const commandOption = Options.text("command").pipe(
  Options.withDescription("Command to execute"),
  Options.withDefault("bash"),
);

const argsOption = Options.text("args").pipe(
  Options.withDescription("Command arguments (comma-separated)"),
  Options.optional,
);

const cwdOption = Options.directory("cwd").pipe(
  Options.withDescription("Working directory"),
  Options.optional,
);

const colsOption = Options.integer("cols").pipe(
  Options.withDescription("Terminal width in columns"),
  Options.withDefault(80),
);

const rowsOption = Options.integer("rows").pipe(
  Options.withDescription("Terminal height in rows"),
  Options.withDefault(24),
);

const interactiveOption = Options.boolean("interactive").pipe(
  Options.withDescription("Enable interactive mode"),
  Options.withDefault(true),
);

// -----------------------------------------------------------------------------
// Command Builder
// -----------------------------------------------------------------------------

export function buildTerminalCommand(): CommandBuilder<"terminal"> {
  const command = () =>
    Command.make(
      "terminal",
      {
        command: commandOption,
        args: argsOption,
        cwd: cwdOption,
        cols: colsOption,
        rows: rowsOption,
        interactive: interactiveOption,
      },
    ).pipe(
      Command.withDescription("Launch an interactive terminal"),
      Command.withHandler(({ command, args, cwd, cols, rows, interactive }) =>
        Effect.gen(function* () {
          yield* trackCommand("terminal");
          yield* trackFeatureUsage("terminal");

          // Parse args if provided
          const argsValue = Option.getOrUndefined(args);
          const parsedArgs = argsValue ? argsValue.split(",").map((a: string) => a.trim()) : ["-i"];

          // Get cwd value
          const cwdValue = Option.getOrUndefined(cwd);

          // Render terminal
          const { waitUntilExit } = render(
            React.createElement(Terminal, {
              command,
              args: parsedArgs,
              cwd: cwdValue,
              cols,
              rows,
              interactive,
              onExit: (code) => {
                console.log(`Process exited with code ${code}`);
              },
            }),
            {
              patchConsole: false,
              exitOnCtrlC: true,
            }
          );

          // Wait for terminal to exit
          yield* Effect.promise(() => waitUntilExit());
        }),
      ),
    );

  return {
    command,
    metadata: {
      name: "terminal",
      description: "Launch an interactive terminal",
    },
  };
}
