import { readFileSync } from "node:fs";
import { Command } from "@effect/cli";
import type { CliApp } from "@effect/cli/CliApp";
import type { CliConfig as CliConfigService } from "@effect/cli/CliConfig";
import * as CliConfig from "@effect/cli/CliConfig";
import type { BunContext as BunContextService } from "@effect/platform-bun/BunContext";
import * as BunContext from "@effect/platform-bun/BunContext";
import type { GitService } from "@open-composer/git-worktrees";
import { GitLive } from "@open-composer/git-worktrees";
import * as Layer from "effect/Layer";
import { TuiCommand } from "./TuiCommand.js";
import { WorktreeCommands } from "./WorktreeCommands.js";

export type ComposerCliServices =
  | GitService
  | CliConfigService
  | BunContextService;

// biome-ignore lint/complexity/noStaticOnlyClass: Exclude for Commands
export class ComposerCli {
  private static readonly packageJson = JSON.parse(
    readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
  ) as { version?: string };

  static readonly version =
    typeof ComposerCli.packageJson.version === "string"
      ? ComposerCli.packageJson.version
      : "0.0.0";

  static readonly layer: Layer.Layer<ComposerCliServices, never, never> =
    Layer.mergeAll(
      CliConfig.layer({ showBuiltIns: false }),
      BunContext.layer,
      GitLive,
    );

  static buildRootCommand() {
    return Command.make("open-composer").pipe(
      Command.withDescription("Open Composer command line interface"),
      Command.withSubcommands([TuiCommand.build(), WorktreeCommands.build()]),
    );
  }

  static buildRunner() {
    const config = {
      name: "Open Composer CLI",
      version: ComposerCli.version,
    } satisfies Omit<CliApp.ConstructorArgs<never>, "command">;

    return Command.run(ComposerCli.buildRootCommand(), config);
  }
}
