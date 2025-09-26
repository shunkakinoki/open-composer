import { Command } from "@effect/cli";
import * as Effect from "effect/Effect";
import { render } from "ink";
import React from "react";
import { ComposerApp } from "../components/ComposerApp.js";

// biome-ignore lint/complexity/noStaticOnlyClass: Exclude for Commands
export class TuiCommand {
  static build() {
    return Command.make("tui").pipe(
      Command.withDescription("Launch the interactive TUI"),
      Command.withHandler(() =>
        Effect.tryPromise({
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
        }),
      ),
    );
  }
}
