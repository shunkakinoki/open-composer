import path from "node:path";
import {
  add as addWorktree,
  type GitService,
  list as listWorktrees,
  move as moveWorktree,
  prune as pruneWorktrees,
  type Worktree,
} from "@open-composer/git-worktrees";
import * as Effect from "effect/Effect";

export interface CreateGitWorktreeOptions {
  readonly path: string;
  readonly ref?: string;
  readonly branch?: string;
  readonly force: boolean;
  readonly detach: boolean;
  readonly checkout?: boolean;
  readonly branchForce: boolean;
}

export interface EditGitWorktreeOptions {
  readonly from: string;
  readonly to: string;
  readonly force: boolean;
}

export interface PruneGitWorktreeOptions {
  readonly dryRun?: boolean;
  readonly verbose?: boolean;
  readonly expire?: string;
}

export type GitWorktreeCliServices = GitService;

export class GitWorktreeService {
  constructor(private readonly cwd: string) {}

  static make(): Effect.Effect<GitWorktreeService, never, GitService> {
    return Effect.sync(() => new GitWorktreeService(process.cwd()));
  }

  list(): Effect.Effect<void, Error, GitService> {
    return listWorktrees({ cwd: this.cwd }).pipe(
      Effect.flatMap((worktrees) =>
        this.printGitWorktreeLines([
          "Git worktrees:",
          ...this.formatGitWorktrees(worktrees, this.cwd),
        ]),
      ),
      Effect.catchAll((error) =>
        Effect.fail(
          new Error(`Failed to list git worktrees: ${this.toMessage(error)}`),
        ),
      ),
    );
  }

  create(
    options: CreateGitWorktreeOptions,
  ): Effect.Effect<void, Error, GitService> {
    const {
      path: worktreePath,
      ref,
      branch,
      force,
      detach,
      checkout,
      branchForce,
    } = options;

    return addWorktree({
      cwd: this.cwd,
      path: worktreePath,
      ref,
      branch: branch
        ? {
            name: branch,
            force: branchForce || force,
          }
        : undefined,
      force,
      detach,
      checkout,
    }).pipe(
      Effect.flatMap((worktree) =>
        this.printGitWorktreeLines([
          `Created worktree at ${worktree.path} tracking ${
            worktree.branch ?? (worktree.detached ? "detached" : "HEAD")
          }.`,
        ]),
      ),
      Effect.catchAll((error) =>
        Effect.fail(
          new Error(`Failed to create git worktree: ${this.toMessage(error)}`),
        ),
      ),
    );
  }

  edit(
    options: EditGitWorktreeOptions,
  ): Effect.Effect<void, Error, GitService> {
    const { from, to, force } = options;

    return moveWorktree({
      cwd: this.cwd,
      from,
      to,
      force,
    }).pipe(
      Effect.flatMap((worktree) =>
        this.printGitWorktreeLines([
          `Moved worktree to ${worktree.path} tracking ${
            worktree.branch ?? (worktree.detached ? "detached" : "HEAD")
          }.`,
        ]),
      ),
      Effect.catchAll((error) =>
        Effect.fail(
          new Error(`Failed to edit git worktree: ${this.toMessage(error)}`),
        ),
      ),
    );
  }

  prune(
    options: PruneGitWorktreeOptions = {},
  ): Effect.Effect<void, Error, GitService> {
    const { dryRun, verbose, expire } = options;

    // If dry-run, list worktrees to show what would be pruned
    if (dryRun) {
      return listWorktrees({ cwd: this.cwd }).pipe(
        Effect.flatMap((worktrees) => {
          const prunableWorktrees = worktrees.filter(
            (worktree) => worktree.prunable,
          );

          if (prunableWorktrees.length === 0) {
            return this.printGitWorktreeLines(["No prunable worktrees found."]);
          }

          const prunablePaths = prunableWorktrees.map(
            (worktree) => worktree.path,
          );
          return this.printGitWorktreeLines([
            `Would prune ${prunableWorktrees.length} worktree(s):`,
            ...prunablePaths.map((path) => `  • ${path}`),
          ]);
        }),
        Effect.catchAll((error) =>
          Effect.fail(
            new Error(
              `Failed to list prunable git worktrees: ${this.toMessage(error)}`,
            ),
          ),
        ),
      );
    }

    // For actual pruning, list worktrees before and after to show what was pruned
    return listWorktrees({ cwd: this.cwd }).pipe(
      Effect.flatMap((worktreesBefore) =>
        pruneWorktrees({
          cwd: this.cwd,
          dryRun: false,
          verbose,
          expire,
        }).pipe(
          Effect.flatMap(() =>
            listWorktrees({ cwd: this.cwd }).pipe(
              Effect.flatMap((worktreesAfter) => {
                const prunedWorktrees = worktreesBefore.filter(
                  (before) =>
                    !worktreesAfter.some(
                      (after) =>
                        path.resolve(after.path) === path.resolve(before.path),
                    ),
                );

                if (prunedWorktrees.length === 0) {
                  return this.printGitWorktreeLines([
                    "No worktrees were pruned.",
                  ]);
                }

                const prunedPaths = prunedWorktrees.map(
                  (worktree) => worktree.path,
                );
                return this.printGitWorktreeLines([
                  `Pruned ${prunedWorktrees.length} worktree(s):`,
                  ...prunedPaths.map((path) => `  • ${path}`),
                ]);
              }),
            ),
          ),
        ),
      ),
      Effect.catchAll((error) =>
        Effect.fail(
          new Error(`Failed to prune git worktrees: ${this.toMessage(error)}`),
        ),
      ),
    );
  }

  private formatGitWorktrees(
    worktrees: readonly Worktree[],
    cwd: string,
  ): string[] {
    if (worktrees.length === 0) {
      return ["No git worktrees found."];
    }

    const normalizedCwd = path.resolve(cwd);
    const branchColumnWidth = Math.max(
      9,
      ...worktrees.map((worktree) =>
        worktree.branch
          ? worktree.branch.length
          : worktree.detached
            ? "(detached)".length
            : "(unknown)".length,
      ),
    );

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
          worktree.locked.reason
            ? `locked: ${worktree.locked.reason}`
            : "locked",
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
  }

  private printGitWorktreeLines(
    lines: ReadonlyArray<string>,
  ): Effect.Effect<void, never> {
    return Effect.forEach(
      lines,
      (line) => Effect.sync(() => console.log(line)),
      { discard: true },
    );
  }

  switch(worktreePath: string): Effect.Effect<void, Error, GitService> {
    return listWorktrees({ cwd: this.cwd }).pipe(
      Effect.flatMap((worktrees) => {
        const targetWorktree = worktrees.find((wt) => wt.path === worktreePath);

        if (!targetWorktree) {
          return Effect.fail(new Error(`Worktree not found: ${worktreePath}`));
        }

        return this.printGitWorktreeLines([
          `Switching to worktree: ${targetWorktree.path}`,
          `Tracking: ${targetWorktree.branch ?? (targetWorktree.detached ? "detached" : "HEAD")}`,
        ]).pipe(
          Effect.flatMap(() =>
            this.printGitWorktreeLines([
              `To switch to this worktree, run: cd ${targetWorktree.path}`,
            ]),
          ),
        );
      }),
      Effect.catchAll((error) =>
        Effect.fail(
          new Error(`Failed to switch git worktree: ${this.toMessage(error)}`),
        ),
      ),
    );
  }

  private toMessage(error: unknown): string {
    if (error instanceof Error && error.message) {
      return error.message;
    }
    return String(error);
  }
}
