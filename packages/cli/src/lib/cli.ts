import { readFileSync } from "node:fs";
import path from "node:path";
import { Args, Command, Options } from "@effect/cli";
import type { CliConfig as CliConfigService } from "@effect/cli/CliConfig";
import * as CliConfig from "@effect/cli/CliConfig";
import type { BunContext as BunContextService } from "@effect/platform-bun/BunContext";
import * as BunContext from "@effect/platform-bun/BunContext";
import {
  add as addWorktree,
  GitLive,
  type GitService,
  list as listWorktrees,
  move as moveWorktree,
  type Worktree,
} from "@open-composer/git-worktrees";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import { render } from "ink";
import React from "react";
import { ComposerApp } from "../components/ComposerApp.js";

const printLine = (line: string) =>
  Effect.sync(() => {
    console.log(line);
  });

const printLines = (lines: ReadonlyArray<string>) =>
  Effect.forEach(lines, printLine, {
    discard: true,
  });

const formatWorktrees = (
  worktrees: readonly Worktree[],
  cwd: string,
): string[] => {
  if (worktrees.length === 0) {
    return ["No git worktrees found."];
  }

  const normalizedCwd = path.resolve(cwd);
  const branchLengths = worktrees.map((worktree) => {
    if (worktree.branch) {
      return worktree.branch.length;
    }
    if (worktree.detached) {
      return "(detached)".length;
    }
    return "(unknown)".length;
  });
  const branchColumnWidth = Math.max(9, ...branchLengths);

  return worktrees.map((worktree) => {
    const branchLabel = worktree.branch
      ? worktree.branch
      : worktree.detached
        ? "(detached)"
        : "(unknown)";
    const marker = path.resolve(worktree.path) === normalizedCwd ? "*" : " ";
    const annotations: string[] = [];
    if (worktree.locked) {
      annotations.push(
        worktree.locked.reason ? `locked: ${worktree.locked.reason}` : "locked",
      );
    }
    if (worktree.prunable) {
      annotations.push(
        worktree.prunable.reason
          ? `prunable: ${worktree.prunable.reason}`
          : "prunable",
      );
    }
    const annotationText =
      annotations.length > 0 ? `  [${annotations.join(", ")}]` : "";
    return `${marker} ${branchLabel.padEnd(branchColumnWidth)}  ${worktree.path}${annotationText}`;
  });
};

const cwdEffect = Effect.sync(() => process.cwd());

const tuiCommand = Command.make("tui").pipe(
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

const listCommand = Command.make("list").pipe(
  Command.withDescription("List git worktrees"),
  Command.withHandler(() =>
    Effect.gen(function* () {
      const cwd = yield* cwdEffect;
      const worktrees = yield* listWorktrees({ cwd });
      yield* printLines(["Git worktrees:", ...formatWorktrees(worktrees, cwd)]);
    }).pipe(
      Effect.catchAll((error) =>
        Effect.fail(
          new Error(
            `Failed to list git worktrees: ${
              error instanceof Error ? error.message : String(error)
            }`,
          ),
        ),
      ),
    ),
  ),
);

const worktreePathArg = Args.text({ name: "path" }).pipe(
  Args.withDescription("Destination path for the worktree"),
);

const worktreeRefArg = Args.text({ name: "ref" }).pipe(
  Args.withDescription("Optional commit-ish or branch to check out"),
  Args.optional,
);

const branchOption = Options.text("branch").pipe(
  Options.optional,
  Options.withDescription("Create and track the specified branch"),
);

const forceOption = Options.boolean("force").pipe(
  Options.withDescription("Force the operation"),
);

const detachOption = Options.boolean("detach").pipe(
  Options.withDescription("Create a detached worktree"),
);

const noCheckoutOption = Options.boolean("no-checkout").pipe(
  Options.withDescription("Do not check out the worktree"),
);

const branchForceOption = Options.boolean("branch-force").pipe(
  Options.withDescription("Force branch creation if it already exists"),
);

const createCommand = Command.make("create", {
  path: worktreePathArg,
  ref: worktreeRefArg,
  branch: branchOption,
  force: forceOption,
  detach: detachOption,
  noCheckout: noCheckoutOption,
  branchForce: branchForceOption,
}).pipe(
  Command.withDescription("Create a new git worktree"),
  Command.withHandler((config) =>
    Effect.gen(function* () {
      const cwd = yield* cwdEffect;
      const worktree = yield* addWorktree({
        cwd,
        path: config.path,
        ref: Option.getOrUndefined(config.ref),
        branch: Option.match(config.branch, {
          onSome: (name) => ({
            name,
            force: config.branchForce || config.force,
          }),
          onNone: () => undefined,
        }),
        force: config.force,
        detach: config.detach,
        checkout: config.noCheckout ? false : undefined,
      });
      const branchLabel =
        worktree.branch ?? (worktree.detached ? "detached" : "HEAD");
      yield* printLines([
        `Created worktree at ${worktree.path} tracking ${branchLabel}.`,
      ]);
    }).pipe(
      Effect.catchAll((error) =>
        Effect.fail(
          new Error(
            `Failed to create git worktree: ${
              error instanceof Error ? error.message : String(error)
            }`,
          ),
        ),
      ),
    ),
  ),
);

const editFromArg = Args.text({ name: "from" }).pipe(
  Args.withDescription("Existing worktree path"),
);

const editToArg = Args.text({ name: "to" }).pipe(
  Args.withDescription("Destination path for the worktree"),
);

const editForceOption = Options.boolean("force").pipe(
  Options.withDescription("Force the move operation"),
);

const editCommand = Command.make("edit", {
  from: editFromArg,
  to: editToArg,
  force: editForceOption,
}).pipe(
  Command.withDescription("Move or rename an existing worktree"),
  Command.withHandler((config) =>
    Effect.gen(function* () {
      const cwd = yield* cwdEffect;
      const worktree = yield* moveWorktree({
        cwd,
        from: config.from,
        to: config.to,
        force: config.force,
      });
      const branchLabel =
        worktree.branch ?? (worktree.detached ? "detached" : "HEAD");
      yield* printLines([
        `Moved worktree to ${worktree.path} tracking ${branchLabel}.`,
      ]);
    }).pipe(
      Effect.catchAll((error) =>
        Effect.fail(
          new Error(
            `Failed to edit git worktree: ${
              error instanceof Error ? error.message : String(error)
            }`,
          ),
        ),
      ),
    ),
  ),
);

const worktreeCommand = Command.make("gw").pipe(
  Command.withDescription("Manage git worktrees"),
  Command.withSubcommands([listCommand, createCommand, editCommand]),
);

const rootCommand = Command.make("open-composer").pipe(
  Command.withDescription("Open Composer command line interface"),
  Command.withSubcommands([tuiCommand, worktreeCommand]),
);

const packageJson = JSON.parse(
  readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
) as { version?: string };

const Version =
  typeof packageJson.version === "string" ? packageJson.version : "0.0.0";

type CliServices = GitService | CliConfigService | BunContextService;

export const cli = Command.run(rootCommand, {
  name: "Open Composer CLI",
  version: Version,
});

export const CliLive: Layer.Layer<CliServices, never, never> = Layer.mergeAll(
  CliConfig.layer({ showBuiltIns: false }),
  BunContext.layer,
  GitLive,
);
