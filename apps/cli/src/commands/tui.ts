import { Command } from "@effect/cli";
import * as Effect from "effect/Effect";
import { render } from "ink";
import React from "react";
import { ComposerApp } from "../components/ComposerApp.js";
import { trackCommand, trackFeatureUsage } from "../services/telemetry.js";

export function buildTUICommand() {
  return Command.make("tui").pipe(
    Command.withDescription("Launch the interactive TUI"),
    Command.withHandler(() =>
      Effect.gen(function* () {
        yield* trackCommand("tui");
        yield* trackFeatureUsage("tui_launch");

        return yield* Effect.tryPromise({
          try: async () => {
            const { waitUntilExit } = render(React.createElement(ComposerApp));
            await waitUntilExit();
          },
          catch: (error) =>
            new Error(
              `Failed to start the TUI: ${
                error instanceof Error ? error.message : String(error)
              }`,
            ),
        });
      }),
    ),
  );
}
