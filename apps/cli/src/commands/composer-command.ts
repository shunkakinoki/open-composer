/** biome-ignore-all lint/suspicious/noExplicitAny: Fix when we have time */

import { Command } from "@effect/cli";
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
import { CLI_VERSION } from "../lib/version.js";
import { CacheLive } from "../services/cache-service.js";
import {
  ConfigLive,
  type ConfigServiceInterface,
} from "../services/config-service.js";
import {
  SettingsLive,
  type SettingsServiceInterface as SettingsService,
} from "../services/settings-service.js";
import {
  TelemetryLive,
  type TelemetryService,
} from "../services/telemetry-service.js";
import { buildAgentsCommand } from "./agents-command.js";
import { buildCacheCommand } from "./cache-command.js";
import { buildConfigCommand } from "./config-command.js";
import { buildGHPRCommand } from "./gh-pr-command.js";
import { buildGitWorktreeCommand } from "./git-worktree-command.js";
import { buildSessionCommand } from "./session-command.js";
import { buildSessionsCommand } from "./sessions-command.js";
import { buildSettingsCommand } from "./settings-command.js";
import { buildSpawnCommand } from "./spawn-command.js";
import { buildStackCommand } from "./stack-command.js";
import { buildStatusCommand } from "./status-command.js";
import { buildTelemetryCommand } from "./telemetry-command.js";
import { buildTUICommand } from "./tui-command.js";

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

// Create base layer without telemetry
const baseLayer = Layer.mergeAll(
  CliConfig.layer({ showBuiltIns: false }),
  BunContext.layer,
  DatabaseLive,
  GitLive,
  GitStackLive,
  ConfigLive,
  CacheLive,
  AgentRouterLive,
  SettingsLive,
);

// Add telemetry layer that depends on config
export const layer = baseLayer.pipe(
  Layer.provideMerge(TelemetryLive.pipe(Layer.provide(baseLayer))),
);

// Function to dynamically generate help text from command builders
function generateHelpText(commandBuilders: Array<() => any>): string {
  let commandsText = "";

  for (const builder of commandBuilders) {
    const command = builder();

    // Extract name and description based on command type
    let name: string;
    let description: string;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const descriptor = (command as any).descriptor;

    if ((descriptor as any)._tag === "Map") {
      // Command with direct handler
      name = (descriptor as any).command.name;
      description = (descriptor as any).command.description.value?.value || "";
    } else if ((descriptor as any)._tag === "Subcommands") {
      // Command with subcommands
      name = (descriptor as any).parent.command.name;
      description =
        (descriptor as any).parent.command.description.value?.value || "";
    } else {
      continue; // Skip unknown command types
    }

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

export function buildRootCommand() {
  return Command.make("open-composer").pipe(
    Command.withDescription("Open Composer command line interface"),
    Command.withHandler(() =>
      Effect.sync(() => {
        console.log(
          generateHelpText([
            buildAgentsCommand,
            // buildCacheCommand, disabled since internal
            // buildConfigCommand, disabled since internal
            buildGHPRCommand,
            buildGitWorktreeCommand,
            buildSessionsCommand,
            buildSessionCommand,
            buildSettingsCommand,
            buildSpawnCommand,
            buildStackCommand,
            buildStatusCommand,
            buildTelemetryCommand,
            buildTUICommand,
          ]),
        );
      }),
    ),
    Command.withSubcommands([
      buildAgentsCommand(),
      buildCacheCommand(),
      buildConfigCommand(),
      buildGHPRCommand(),
      buildGitWorktreeCommand(),
      buildSessionsCommand(),
      buildSessionCommand(),
      buildSettingsCommand(),
      buildSpawnCommand(),
      buildStackCommand(),
      buildStatusCommand(),
      buildTelemetryCommand(),
      buildTUICommand(),
    ]),
  );
}

export function buildRunner() {
  const config = {
    name: "Open Composer CLI",
    version: CLI_VERSION,
  } satisfies Omit<CliApp.ConstructorArgs<never>, "command">;

  return Command.run(buildRootCommand(), config);
}
