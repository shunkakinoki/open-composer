import path from "node:path";
import {
  add as addWorktree,
  type GitService,
  list as listWorktrees,
  move as moveWorktree,
  type Worktree,
} from "@open-composer/git-worktrees";
import * as Effect from "effect/Effect";

export interface CreateWorktreeOptions {
  readonly path: string;
  readonly ref?: string;
  readonly branch?: string;
  readonly force: boolean;
  readonly detach: boolean;
  readonly checkout?: boolean;
  readonly branchForce: boolean;
}

export interface EditWorktreeOptions {
  readonly from: string;
  readonly to: string;
  readonly force: boolean;
}

export type WorktreeCliServices = GitService;

export class WorktreeCli {
  constructor(private readonly cwd: string) {}

  static make(): Effect.Effect<WorktreeCli> {
    return Effect.sync(() => new WorktreeCli(process.cwd()));
  }

  list(): Effect.Effect<void, Error> {
    return listWorktrees({ cwd: this.cwd }).pipe(
      Effect.flatMap((worktrees) =>
        this.printLines([
          "Git worktrees:",
          ...this.formatWorktrees(worktrees, this.cwd),
        ]),
      ),
      Effect.catchAll((error) =>
        Effect.fail(
          new Error(`Failed to list git worktrees: ${this.toMessage(error)}`),
        ),
      ),
    );
  }

  create(options: CreateWorktreeOptions): Effect.Effect<void, Error> {
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
        this.printLines([
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

  edit(options: EditWorktreeOptions): Effect.Effect<void, Error> {
    const { from, to, force } = options;

    return moveWorktree({
      cwd: this.cwd,
      from,
      to,
      force,
    }).pipe(
      Effect.flatMap((worktree) =>
        this.printLines([
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

  private formatWorktrees(
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

  private printLines(lines: ReadonlyArray<string>): Effect.Effect<void, never> {
    return Effect.forEach(
      lines,
      (line) => Effect.sync(() => console.log(line)),
      { discard: true },
    );
  }

  private toMessage(error: unknown): string {
    if (error instanceof Error && error.message) {
      return error.message;
    }
    return String(error);
  }
}
