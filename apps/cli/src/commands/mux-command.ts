import { Command, Options } from "@effect/cli";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import { render } from "ink";
import React from "react";
import { Multiplexer } from "@open-composer/multiplexer";
import type { Layout } from "@open-composer/multiplexer";
import {
  trackCommand,
  trackFeatureUsage,
} from "../services/telemetry-service.js";
import type { CommandBuilder } from "../types/commands.js";

// -----------------------------------------------------------------------------
// Command Options
// -----------------------------------------------------------------------------

const layoutOption = Options.text("layout").pipe(
  Options.withDescription("Layout type: simple, horizontal, vertical, or complex"),
  Options.withDefault("simple"),
);

const commandOption = Options.text("command").pipe(
  Options.withDescription("Command to execute in panes"),
  Options.withDefault("bash"),
);

const widthOption = Options.integer("width").pipe(
  Options.withDescription("Multiplexer width"),
  Options.optional,
);

const heightOption = Options.integer("height").pipe(
  Options.withDescription("Multiplexer height"),
  Options.optional,
);

const showBordersOption = Options.boolean("borders").pipe(
  Options.withDescription("Show pane borders"),
  Options.withDefault(false),
);

const showHelpOption = Options.boolean("help-text").pipe(
  Options.withDescription("Show help text"),
  Options.withDefault(true),
);

const fullScreenOption = Options.boolean("fullscreen").pipe(
  Options.withDescription("Enter full screen mode"),
  Options.withDefault(true),
);

// -----------------------------------------------------------------------------
// Helper Functions
// -----------------------------------------------------------------------------

function createLayout(type: string, command: string): Layout {
  switch (type) {
    case "horizontal":
      return {
        type: "split",
        id: "root",
        direction: "horizontal",
        children: [
          {
            type: "pane",
            id: "left",
            command,
            args: ["-i"],
            title: "Left Pane",
            focus: true,
          },
          {
            type: "pane",
            id: "right",
            command,
            args: ["-i"],
            title: "Right Pane",
          },
        ],
      };

    case "vertical":
      return {
        type: "split",
        id: "root",
        direction: "vertical",
        children: [
          {
            type: "pane",
            id: "top",
            command,
            args: ["-i"],
            title: "Top Pane",
            focus: true,
          },
          {
            type: "pane",
            id: "bottom",
            command,
            args: ["-i"],
            title: "Bottom Pane",
          },
        ],
      };

    case "complex":
      return {
        type: "split",
        id: "root",
        direction: "horizontal",
        children: [
          {
            type: "pane",
            id: "left",
            command,
            args: ["-i"],
            title: "Main",
            size: "70%",
            focus: true,
          },
          {
            type: "split",
            id: "right-split",
            direction: "vertical",
            size: "30%",
            children: [
              {
                type: "pane",
                id: "top-right",
                command,
                args: ["-i"],
                title: "Top",
              },
              {
                type: "pane",
                id: "bottom-right",
                command,
                args: ["-i"],
                title: "Bottom",
              },
            ],
          },
        ],
      };

    case "simple":
    default:
      return {
        type: "pane",
        id: "main",
        command,
        args: ["-i"],
        title: "Terminal",
        focus: true,
      };
  }
}

// -----------------------------------------------------------------------------
// Command Builder
// -----------------------------------------------------------------------------

export function buildMuxCommand(): CommandBuilder<"mux"> {
  const command = () =>
    Command.make(
      "mux",
      {
        layout: layoutOption,
        command: commandOption,
        width: widthOption,
        height: heightOption,
        borders: showBordersOption,
        helpText: showHelpOption,
        fullscreen: fullScreenOption,
      },
    ).pipe(
      Command.withDescription("Launch a terminal multiplexer (tmux-like)"),
      Command.withHandler(
        ({ layout: layoutType, command, width, height, borders, helpText, fullscreen }) =>
          Effect.gen(function* () {
            yield* trackCommand("mux");
            yield* trackFeatureUsage("mux");

            const layout = createLayout(layoutType, command);

            // Get optional values
            const widthValue = Option.getOrUndefined(width);
            const heightValue = Option.getOrUndefined(height);

            // Render multiplexer
            const { waitUntilExit } = render(
              React.createElement(Multiplexer, {
                layout,
                width: widthValue,
                height: heightValue,
                showBorders: borders,
                showHelp: helpText,
                enterFullScreen: fullscreen,
              }),
              {
                patchConsole: false,
                exitOnCtrlC: false, // Multiplexer handles its own exit
              }
            );

            // Wait for multiplexer to exit
            yield* Effect.promise(() => waitUntilExit());
          }),
      ),
    );

  return {
    command,
    metadata: {
      name: "mux",
      description: "Launch a terminal multiplexer (tmux-like)",
    },
  };
}
