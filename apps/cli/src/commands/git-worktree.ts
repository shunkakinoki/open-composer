import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { Args, Command, Options } from "@effect/cli";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import type { GitWorktreeCreateOptions } from "../components/GitWorktreeCreatePrompt.js";
import { GitWorktreeCli } from "../services/git-worktree-cli.js";
import { trackCommand, trackFeatureUsage } from "../services/telemetry.js";

const execFileAsync = promisify(execFile);

const calculateDefaultWorktreePath = (): Effect.Effect<string, Error> =>
  Effect.gen(function* (_) {
    // Get the git repository root directory
    const repoRootResult = yield* _(
      Effect.tryPromise({
        try: () =>
          execFileAsync("git", ["rev-parse", "--show-toplevel"], {
            cwd: process.cwd(),
          }),
        catch: (_) => Promise.reject(new Error("Not in a git repository")),
      }),
    );

    const repoRoot = repoRootResult.stdout.trim();

    // Check if we're inside a git repository
    const isInsideWorkTreeResult = yield* _(
      Effect.tryPromise({
        try: () =>
          execFileAsync("git", ["rev-parse", "--is-inside-work-tree"], {
            cwd: repoRoot,
          }),
        catch: (_) => Promise.reject(new Error("Not in a git repository")),
      }),
    );

    if (isInsideWorkTreeResult.stdout.trim() !== "true") {
      return "";
    }

    // Get the git directory to determine if we're in a worktree
    const gitDirResult = yield* _(
      Effect.tryPromise({
        try: () =>
          execFileAsync("git", ["rev-parse", "--git-dir"], {
            cwd: repoRoot,
          }),
        catch: (error) =>
          Promise.reject(new Error(`Failed to get git directory: ${error}`)),
      }),
    );

    const gitDirPath = gitDirResult.stdout.trim();

    // Get repository name from remote origin or current directory
    const repoName = yield* _(
      Effect.tryPromise({
        try: async () => {
          try {
            const remoteUrl = await execFileAsync(
              "git",
              ["config", "--get", "remote.origin.url"],
              { cwd: repoRoot },
            );
            const url = remoteUrl.stdout.trim();
            // Extract repo name from URL (e.g., "github.com/user/repo.git" -> "repo")
            const match = url.match(/\/([^/]+?)(\.git)?$/);
            if (match) {
              return match[1];
            }
          } catch {
            // If no remote, use directory name
          }
          // Fallback to directory name
          return path.basename(repoRoot);
        },
        catch: (error) =>
          Promise.reject(new Error(`Failed to get repository name: ${error}`)),
      }),
    );

    // Check if we're in a worktree (git dir contains "worktrees")
    const isInWorktree =
      gitDirPath.includes("worktrees") || gitDirPath.includes(".git/worktrees");

    if (isInWorktree) {
      // If we're already in a worktree, create relatively
      return "";
    } else {
      // If we're in the main repo, use <repo>.worktree/<name> format
      return path.join(repoRoot, `${repoName}.worktree/`);
    }
  }).pipe(
    Effect.catchAll(() => Effect.succeed("")), // If anything fails, return empty string (no default)
  );

export function buildGitWorktreeCommand() {
  return Command.make("gw").pipe(
    Command.withDescription("Manage git worktrees"),
    Command.withSubcommands([
      buildListCommand(),
      buildCreateCommand(),
      buildEditCommand(),
      buildPruneCommand(),
      buildSwitchCommand(),
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

        process.exit(0);
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

          // Calculate default path based on current location
          const defaultPath = yield* _(calculateDefaultWorktreePath());

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
                          defaultPath,
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

          // Exit cleanly after interactive creation
          process.exit(0);
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

        // Exit cleanly after CLI creation
        process.exit(0);
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

        process.exit(0);
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

        process.exit(0);
      }),
    ),
  );
}

function buildSwitchCommand() {
  const pathArg = Args.text({ name: "path" }).pipe(
    Args.withDescription("Path of the worktree to switch to"),
    Args.optional,
  );

  return Command.make("switch", { path: pathArg }).pipe(
    Command.withDescription("Switch to a different git worktree"),
    Command.withHandler((config) =>
      Effect.gen(function* (_) {
        yield* _(trackCommand("gw", "switch"));
        yield* _(trackFeatureUsage("git_worktree_switch"));

        // If path is not provided, show interactive prompt
        const pathValue = Option.getOrElse(config.path, () => "");
        if (!pathValue.trim()) {
          // Get worktree selection from interactive prompt
          const selectedWorktree = yield* _(
            Effect.tryPromise({
              try: async () => {
                const { render } = await import("ink");
                const React = await import("react");
                const { GitWorktreeSwitchPrompt } = await import(
                  "../components/GitWorktreeSwitchPrompt"
                );

                return new Promise<string | null>((resolve, reject) => {
                  try {
                    const { waitUntilExit } = render(
                      React.createElement(GitWorktreeSwitchPrompt, {
                        onSubmit: (worktreePath) => {
                          // Clean up the Ink app and resolve
                          waitUntilExit()
                            .then(() => resolve(worktreePath))
                            .catch(reject);
                        },
                        onCancel: () => {
                          // Clean up the Ink app and resolve with null
                          waitUntilExit()
                            .then(() => resolve(null))
                            .catch(reject);
                        },
                      }),
                    );
                  } catch (error) {
                    reject(error);
                  }
                });
              },
              catch: (error) => {
                return Effect.fail(
                  new Error(
                    `Failed to show interactive worktree switch prompt: ${error}`,
                  ),
                );
              },
            }),
          );

          if (!selectedWorktree) {
            // User cancelled
            process.exit(0);
          }

          const cli = yield* _(GitWorktreeCli.make());
          yield* _(cli.switch(selectedWorktree));
        } else {
          // Use command line argument
          const cli = yield* _(GitWorktreeCli.make());
          yield* _(cli.switch(Option.getOrElse(config.path, () => "")));
        }

        process.exit(0);
      }),
    ),
  );
}
