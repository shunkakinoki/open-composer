import { Args, Command, Options } from "@effect/cli";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import type { GitWorktreeCreateOptions } from "../components/GitWorktreeCreatePrompt.js";
import { GitWorktreeCli } from "../services/git-worktree-cli.js";
import { trackCommand, trackFeatureUsage } from "../services/telemetry.js";

export function buildGitWorktreeCommand() {
  return Command.make("gw").pipe(
    Command.withDescription("Manage git worktrees"),
    Command.withSubcommands([
      buildListCommand(),
      buildCreateCommand(),
      buildEditCommand(),
      buildPruneCommand(),
    ]),
  );
}

function buildListCommand() {
  return Command.make("list").pipe(
    Command.withDescription("List git worktrees"),
    Command.withHandler(() =>
      Effect.gen(function* (_) {
        yield* _(trackCommand("gw", "list"));
        yield* _(trackFeatureUsage("git_worktree_list"));

        const cli = yield* _(GitWorktreeCli.make());
        yield* _(cli.list());
      }),
    ),
  );
}

function buildCreateCommand() {
  const pathArg = Args.text({ name: "path" }).pipe(
    Args.withDescription("Destination path for the worktree"),
    Args.optional, // Make path optional for interactive mode
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
      Effect.gen(function* (_) {
        // If path is not provided, show interactive prompt
        if (!config.path || !Option.getOrElse(config.path, () => "").trim()) {
          // Check if we're in a CI environment
          const isCI =
            process.env.CI ||
            process.env.CONTINUOUS_INTEGRATION ||
            process.env.GITHUB_ACTIONS;

          if (isCI) {
            return yield* _(
              Effect.fail(
                new Error(
                  "Path argument is required. Run 'open-composer gw create <path>' with a path argument.",
                ),
              ),
            );
          }

          // Get options from interactive prompt
          const options = yield* _(
            Effect.tryPromise({
              try: async () => {
                const { render } = await import("ink");
                const React = await import("react");
                const { GitWorktreeCreatePrompt } = await import(
                  "../components/GitWorktreeCreatePrompt.js"
                );

                return new Promise<GitWorktreeCreateOptions>(
                  (resolve, reject) => {
                    try {
                      const { waitUntilExit } = render(
                        React.createElement(GitWorktreeCreatePrompt, {
                          onSubmit: (options) => {
                            // Clean up the Ink app and resolve
                            waitUntilExit()
                              .then(() => resolve(options))
                              .catch(reject);
                          },
                          onCancel: () => {
                            // Clean up the Ink app and reject
                            waitUntilExit()
                              .then(() =>
                                reject(
                                  new Error("User cancelled worktree creation"),
                                ),
                              )
                              .catch(reject);
                          },
                        }),
                      );
                    } catch (error) {
                      reject(error);
                    }
                  },
                );
              },
              catch: (error) => {
                return Effect.fail(
                  new Error(
                    `Failed to show interactive worktree creation prompt: ${error}`,
                  ),
                );
              },
            }),
          );

          // Track the interactive creation
          yield* _(trackCommand("gw", "create"));
          yield* _(
            trackFeatureUsage("git_worktree_create_interactive", {
              has_ref: !!options.ref,
              has_branch: !!options.branch,
              force: options.force,
              detach: options.detach,
              no_checkout: options.noCheckout,
              branch_force: options.branchForce,
            }),
          );

          // Create the worktree using the selected options
          const cli = yield* _(GitWorktreeCli.make());
          yield* _(
            cli.create({
              path: options.path,
              ref: options.ref || undefined,
              branch: options.branch || undefined,
              force: options.force,
              detach: options.detach,
              checkout: options.noCheckout ? false : undefined,
              branchForce: options.branchForce,
            }),
          );
        }

        // Use command line arguments for worktree creation
        yield* _(trackCommand("gw", "create"));
        yield* _(
          trackFeatureUsage("git_worktree_create", {
            has_ref: Option.isSome(config.ref),
            has_branch: Option.isSome(config.branch),
            force: config.force,
            detach: config.detach,
            no_checkout: config.noCheckout,
            branch_force: config.branchForce,
          }),
        );

        const cli = yield* _(GitWorktreeCli.make());
        yield* _(
          cli.create({
            path: Option.getOrElse(config.path, () => ""),
            ref: config.ref.pipe(Option.getOrUndefined),
            branch: config.branch.pipe(Option.getOrUndefined),
            force: config.force,
            detach: config.detach,
            checkout: config.noCheckout ? false : undefined,
            branchForce: config.branchForce,
          }),
        );
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
      Effect.gen(function* (_) {
        yield* _(trackCommand("gw", "edit"));
        yield* _(
          trackFeatureUsage("git_worktree_edit", {
            force: config.force,
          }),
        );

        const cli = yield* _(GitWorktreeCli.make());
        yield* _(
          cli.edit({
            from: config.from,
            to: config.to,
            force: config.force,
          }),
        );
      }),
    ),
  );
}

function buildPruneCommand() {
  const dryRunOption = Options.boolean("dry-run").pipe(
    Options.withDescription(
      "Show what would be pruned without actually pruning",
    ),
  );

  const verboseOption = Options.boolean("verbose").pipe(
    Options.withDescription("Show verbose output"),
  );

  const expireOption = Options.text("expire").pipe(
    Options.optional,
    Options.withDescription("Only expire loose worktrees older than <time>"),
  );

  return Command.make("prune", {
    dryRun: dryRunOption,
    verbose: verboseOption,
    expire: expireOption,
  }).pipe(
    Command.withDescription("Prune worktrees not in any branch or tag"),
    Command.withHandler((config) =>
      Effect.gen(function* (_) {
        yield* _(trackCommand("gw", "prune"));
        yield* _(
          trackFeatureUsage("git_worktree_prune", {
            dry_run: config.dryRun,
            verbose: config.verbose,
            has_expire: Option.isSome(config.expire),
          }),
        );

        const cli = yield* _(GitWorktreeCli.make());
        yield* _(
          cli.prune({
            dryRun: config.dryRun,
            verbose: config.verbose,
            expire: config.expire.pipe(Option.getOrUndefined),
          }),
        );
      }),
    ),
  );
}
