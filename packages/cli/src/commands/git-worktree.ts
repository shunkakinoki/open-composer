import { Args, Command, Options } from "@effect/cli";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import { GitWorktreeCli } from "../services/git-worktree-cli.js";

export function buildGitWorktreeCommand() {
  return Command.make("gw").pipe(
    Command.withDescription("Manage git worktrees"),
    Command.withSubcommands([
      buildListCommand(),
      buildCreateCommand(),
      buildEditCommand(),
    ]),
  );
}

function buildListCommand() {
  return Command.make("list").pipe(
    Command.withDescription("List git worktrees"),
    Command.withHandler(() =>
      Effect.gen(function* () {
        const cli = yield* GitWorktreeCli.make();
        yield* cli.list();
      }),
    ),
  );
}

function buildCreateCommand() {
  const pathArg = Args.text({ name: "path" }).pipe(
    Args.withDescription("Destination path for the worktree"),
  );

  const refArg = Args.text({ name: "ref" }).pipe(
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

  return Command.make("create", {
    path: pathArg,
    ref: refArg,
    branch: branchOption,
    force: forceOption,
    detach: detachOption,
    noCheckout: noCheckoutOption,
    branchForce: branchForceOption,
  }).pipe(
    Command.withDescription("Create a new git worktree"),
    Command.withHandler((config) =>
      Effect.gen(function* () {
        const cli = yield* GitWorktreeCli.make();
        yield* cli.create({
          path: config.path,
          ref: Option.getOrUndefined(config.ref),
          branch: Option.getOrUndefined(config.branch),
          force: config.force,
          detach: config.detach,
          checkout: config.noCheckout ? false : undefined,
          branchForce: config.branchForce,
        });
      }),
    ),
  );
}

function buildEditCommand() {
  const fromArg = Args.text({ name: "from" }).pipe(
    Args.withDescription("Existing worktree path"),
  );

  const toArg = Args.text({ name: "to" }).pipe(
    Args.withDescription("Destination path for the worktree"),
  );

  const forceOption = Options.boolean("force").pipe(
    Options.withDescription("Force the move operation"),
  );

  return Command.make("edit", {
    from: fromArg,
    to: toArg,
    force: forceOption,
  }).pipe(
    Command.withDescription("Move or rename an existing worktree"),
    Command.withHandler((config) =>
      Effect.gen(function* () {
        const cli = yield* GitWorktreeCli.make();
        yield* cli.edit({
          from: config.from,
          to: config.to,
          force: config.force,
        });
      }),
    ),
  );
}
