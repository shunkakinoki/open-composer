import { Command } from "@effect/cli";
import type { CliApp } from "@effect/cli/CliApp";
import type { CliConfig as CliConfigService } from "@effect/cli/CliConfig";
import * as CliConfig from "@effect/cli/CliConfig";
import type { BunContext as BunContextService } from "@effect/platform-bun/BunContext";
import * as BunContext from "@effect/platform-bun/BunContext";
import { type AgentRouter, AgentRouterLive } from "@open-composer/agent-router";
import { GitStackLive, type GitStackService } from "@open-composer/git-stack";
import type { GitService } from "@open-composer/git-worktrees";
import { GitLive } from "@open-composer/git-worktrees";
import * as Layer from "effect/Layer";
import { CLI_VERSION } from "../lib/version.js";
import { ConfigLive, type ConfigService } from "../services/config.js";
import { TelemetryLive, type TelemetryService } from "../services/telemetry.js";
import { buildAgentsCommand } from "./agents.js";
import { buildGitWorktreeCommand } from "./git-worktree.js";
import { buildStackCommand } from "./stack.js";
import { buildTelemetryCommand } from "./telemetry.js";
import { buildTUICommand } from "./tui.js";

export type ComposerCliServices =
  | AgentRouter
  | GitStackService
  | GitService
  | CliConfigService
  | BunContextService
  | ConfigService
  | TelemetryService;

export const layer = Layer.mergeAll(
  CliConfig.layer({ showBuiltIns: false }),
  BunContext.layer,
  GitLive,
  GitStackLive,
  AgentRouterLive,
  ConfigLive,
  TelemetryLive,
);

export function buildRootCommand() {
  return Command.make("open-composer").pipe(
    Command.withDescription("Open Composer command line interface"),
    Command.withSubcommands([
      buildTUICommand(),
      buildGitWorktreeCommand(),
      buildAgentsCommand(),
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
