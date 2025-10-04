import { Command, Options } from "@effect/cli";
import type { CliApp } from "@effect/cli/CliApp";
import type { CliConfig as CliConfigService } from "@effect/cli/CliConfig";
import * as CliConfig from "@effect/cli/CliConfig";
import type { BunContext as BunContextService } from "@effect/platform-bun/BunContext";
import * as BunContext from "@effect/platform-bun/BunContext";
import { type AgentRouter, AgentRouterLive } from "@open-composer/agent-router";
import { DatabaseLive, type SqliteDrizzle } from "@open-composer/db";
import type { GitService } from "@open-composer/git";
import { GitLive } from "@open-composer/git";
import { GitStackLive, type GitStackService } from "@open-composer/git-stack";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { render } from "ink";
import React from "react";
import { WelcomeScreen } from "../components/WelcomeScreen.js";
import { CLI_VERSION } from "../lib/version.js";
import { CacheLive } from "../services/cache-service.js";
import {
  ConfigLive,
  type ConfigServiceInterface,
} from "../services/config-service.js";
import { OrchestratorLive } from "../services/orchestrator-service.js";
import {
  SettingsLive,
  type SettingsServiceInterface as SettingsService,
} from "../services/settings-service.js";
import {
  TelemetryLive,
  type TelemetryService,
} from "../services/telemetry-service.js";
import type { CommandBuilder } from "../types/commands.js";
import { buildAgentsCommand } from "./agents-command.js";
import { buildCacheCommand } from "./cache-command.js";
import { buildConfigCommand } from "./config-command.js";
import { buildGHPRCommand } from "./gh-pr-command.js";
import { buildGitWorktreeCommand } from "./git-worktree-command.js";
import { buildOrchestratorCommand } from "./orchestrator-command.js";
import { buildRunCommand } from "./run-command.js";
import { buildSessionCommand } from "./session-command.js";
import { buildSessionsCommand } from "./sessions-command.js";
import { buildSettingsCommand } from "./settings-command.js";
import { buildSpawnCommand } from "./spawn-command.js";
import { buildStackCommand } from "./stack-command.js";
import { buildStatusCommand } from "./status-command.js";
import { buildTelemetryCommand } from "./telemetry-command.js";
import { buildTUICommand } from "./tui-command.js";
import { buildUpgradeCommand } from "./upgrade-command.js";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type ComposerCliServices =
  | SqliteDrizzle
  | AgentRouter
  | GitStackService
  | GitService
  | CliConfigService
  | BunContextService
  | ConfigServiceInterface
  | SettingsService
  | TelemetryService;

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

// Create base layer without telemetry
const BASE_LAYER = Layer.mergeAll(
  CliConfig.layer({ showBuiltIns: false, showTypes: false }),
  BunContext.layer,
  DatabaseLive,
  GitLive,
  GitStackLive,
  ConfigLive,
  CacheLive,
  AgentRouterLive,
  OrchestratorLive,
  SettingsLive,
);

// Add telemetry layer that depends on config
export const ROOT_LAYER = BASE_LAYER.pipe(
  Layer.provideMerge(TelemetryLive.pipe(Layer.provide(BASE_LAYER))),
);

const ALL_COMMAND_BUILDERS = [
  buildAgentsCommand,
  buildCacheCommand,
  buildConfigCommand,
  buildGHPRCommand,
  buildGitWorktreeCommand,
  buildOrchestratorCommand,
  buildRunCommand,
  buildSessionCommand,
  buildSessionsCommand,
  buildSettingsCommand,
  buildSpawnCommand,
  buildStackCommand,
  buildStatusCommand,
  buildTelemetryCommand,
  buildTUICommand,
  buildUpgradeCommand,
];

const EXCLUDED_HELP_TEXT_NAMES = ["cache", "config"];

const HELP_TEXT_BUILDERS = ALL_COMMAND_BUILDERS.filter((cb) => {
  const built = cb();
  return !EXCLUDED_HELP_TEXT_NAMES.includes(built.metadata.name);
});

// -----------------------------------------------------------------------------
// Helper Functions
// -----------------------------------------------------------------------------

// Function to generate help text from command builders with explicit metadata
function generateHelpText(commandBuilders: CommandBuilder[]): string {
  let commandsText = "";

  for (const builder of commandBuilders) {
    const { name, description } = builder.metadata;

    // Format the command line
    const paddedName = name.padEnd(18);
    commandsText += `\n  ${paddedName}${description}`;
  }

  return `Open Composer CLI

USAGE
  $ open-composer <command>

COMMANDS${commandsText}

Run 'open-composer <command> --help' for more information on a specific command.`;
}

// Helper function to display help text - used by both buildRootCommand and buildRunner
function displayHelpText(): Effect.Effect<void> {
  return Effect.sync(() => {
    console.log(
      generateHelpText(
        HELP_TEXT_BUILDERS.map((cb) => cb()) as CommandBuilder[],
      ),
    );
  });
}

// -----------------------------------------------------------------------------
// Command Implmentations
// -----------------------------------------------------------------------------

export function buildRootCommand() {
  const helpOption = Options.boolean("help").pipe(
    Options.withDescription("Show help text instead of TUI"),
  );

  return Command.make("open-composer", { help: helpOption }).pipe(
    Command.withDescription("Open Composer command line interface"),
    Command.withHandler(({ help }) => {
      if (help) {
        // Show help text
        return displayHelpText();
      }
      // Launch TUI
      return Effect.tryPromise({
        try: async () => {
          const { waitUntilExit } = render(
            React.createElement(WelcomeScreen, {
              onCommandSelect: (commandName) => {
                // For now, just log the selected command
                // In the future, this could trigger actual command execution
                console.log(`Selected command: ${commandName}`);
              },
            }),
          );
          await waitUntilExit();
        },
        catch: (error) =>
          new Error(
            `Failed to start the welcome screen: ${
              error instanceof Error ? error.message : String(error)
            }`,
          ),
      });
    }),
    Command.withSubcommands(
      // biome-ignore lint/suspicious/noExplicitAny: Command union types incompatible with generic Command type
      ALL_COMMAND_BUILDERS.map((cb) => cb().command()) as any,
    ),
  );
}

export function buildRunner() {
  const config = {
    name: "Open Composer CLI",
    version: CLI_VERSION,
  } satisfies Omit<CliApp.ConstructorArgs<never>, "command">;

  const runner = Command.run(buildRootCommand(), config);

  // Return a function that intercepts --help
  return (processArgs: string[]) => {
    // Check if --help was passed without any command
    // If so, show custom help text instead of default @effect/cli help
    const args = processArgs.slice(2);
    if (args.length === 1 && (args[0] === "--help" || args[0] === "-h")) {
      return displayHelpText();
    }

    return runner(processArgs);
  };
}
