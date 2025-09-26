import { readFileSync } from "node:fs";
import { Command } from "@effect/cli";
import type { CliApp } from "@effect/cli/CliApp";
import type { CliConfig as CliConfigService } from "@effect/cli/CliConfig";
import * as CliConfig from "@effect/cli/CliConfig";
import type { BunContext as BunContextService } from "@effect/platform-bun/BunContext";
import * as BunContext from "@effect/platform-bun/BunContext";
import { type AgentRouter, AgentRouterLive } from "@open-composer/agent-router";
import type { GitService } from "@open-composer/git-worktrees";
import { GitLive } from "@open-composer/git-worktrees";
import * as Layer from "effect/Layer";
import { buildAgentsCommand } from "./agents.js";
import { buildGitWorktreeCommand } from "./git-worktree.js";
import { buildTUICommand } from "./tui.js";

export type ComposerCliServices =
  | AgentRouter
  | GitService
  | CliConfigService
  | BunContextService;

const packageJson = JSON.parse(
  readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
) as { version?: string };

export const version =
  typeof packageJson.version === "string" ? packageJson.version : "0.0.0";

export const layer: Layer.Layer<ComposerCliServices, never, never> =
  Layer.mergeAll(
    CliConfig.layer({ showBuiltIns: false }),
    BunContext.layer,
    GitLive,
    AgentRouterLive,
  );

export function buildRootCommand() {
  return Command.make("open-composer").pipe(
    Command.withDescription("Open Composer command line interface"),
    Command.withSubcommands([
      buildTUICommand(),
      buildGitWorktreeCommand(),
      buildAgentsCommand(),
    ]),
  );
}

export function buildRunner() {
  const config = {
    name: "Open Composer CLI",
    version,
  } satisfies Omit<CliApp.ConstructorArgs<never>, "command">;

  return Command.run(buildRootCommand(), config);
}
