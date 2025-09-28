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
import * as Layer from "effect/Layer";
import { CLI_VERSION } from "../lib/version.js";
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
import { buildGHPRCommand } from "./gh-pr-command.js";
import { buildGitWorktreeCommand } from "./git-worktree-command.js";
import { buildSessionsCommand } from "./sessions-command.js";
import { buildSettingsCommand } from "./settings-command.js";
import { buildStackCommand } from "./stack-command.js";
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
  AgentRouterLive,
  ConfigLive,
  SettingsLive,
);

// Add telemetry layer that depends on config
export const layer = baseLayer.pipe(
  Layer.provideMerge(TelemetryLive.pipe(Layer.provide(baseLayer))),
);

export function buildRootCommand() {
  return Command.make("open-composer").pipe(
    Command.withDescription("Open Composer command line interface"),
    Command.withSubcommands([
      buildTUICommand(),
      buildGitWorktreeCommand(),
      buildAgentsCommand(),
      buildGHPRCommand(),
      buildSessionsCommand(),
      buildSettingsCommand(),
      buildStackCommand(),
      buildTelemetryCommand(),
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
