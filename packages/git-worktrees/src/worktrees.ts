import * as path from "node:path";
import * as Effect from "effect/Effect";
import { pipe } from "effect/Function";
import {
  type GitWorktreeError,
  type GitWorktreeNotFoundError,
  parseError,
  worktreeNotFoundError,
} from "./errors.js";
import {
  type GitCommandError,
  type GitCommandOptions,
  run as runGit,
} from "@open-composer/git";
import { type ParsedWorktree, parsePorcelainList } from "./parse.js";

// -----------------------------------------------------------------------------
// Worktree
// -----------------------------------------------------------------------------

export type Worktree = ParsedWorktree;

export interface ListOptions extends GitCommandOptions {}

const parseListOutput = (
  stdout: string,
): Effect.Effect<readonly Worktree[], GitWorktreeError> =>
  Effect.try({
    try: () => parsePorcelainList(stdout),
    catch: (cause) => parseError({ stdout, cause }),
  });

export const list = (
  options: ListOptions = {},
): Effect.Effect<readonly Worktree[], GitCommandError | GitWorktreeError> =>
  pipe(
    runGit(["worktree", "list", "--porcelain"], options),
    Effect.flatMap(({ stdout }) => parseListOutput(stdout)),
  );

const findByPath = (
  worktrees: readonly Worktree[],
  absolutePath: string,
): Effect.Effect<Worktree, GitWorktreeNotFoundError> => {
  const normalized = path.normalize(absolutePath);
  const match = worktrees.find(
    (candidate) => path.normalize(candidate.path) === normalized,
  );

  if (match) {
    return Effect.succeed(match);
  }

  return Effect.fail(worktreeNotFoundError(normalized));
};

export interface AddOptions extends GitCommandOptions {
  readonly path: string;
  readonly ref?: string;
  readonly branch?: {
    readonly name: string;
    readonly force?: boolean;
  };
  readonly detach?: boolean;
  readonly force?: boolean;
  readonly lock?: {
    readonly reason?: string;
  };
  readonly checkout?: boolean;
}

const buildAddArgs = (input: AddOptions): string[] => {
  const args = ["worktree", "add"];

  if (input.force) {
    args.push("--force");
  }

  if (input.detach) {
    args.push("--detach");
  }

  if (input.checkout === false) {
    args.push("--no-checkout");
  }

  if (input.lock) {
    args.push("--lock");
    if (input.lock.reason) {
      args.push("--reason", input.lock.reason);
    }
  }

  if (input.branch) {
    args.push(input.branch.force ? "-B" : "-b", input.branch.name);
  }

  args.push("--", input.path);

  if (input.ref) {
    args.push(input.ref);
  }

  return args;
};

export const add = (
  input: AddOptions,
): Effect.Effect<Worktree, GitCommandError | GitWorktreeError> => {
  const cwd =
    typeof input.cwd === "string"
      ? input.cwd
      : (input.cwd?.pathname ?? process.cwd());
  const absolute = path.resolve(cwd, input.path);

  return pipe(
    runGit(buildAddArgs(input), input),
    Effect.zipRight(list(input)),
    Effect.flatMap((worktrees) => findByPath(worktrees, absolute)),
  );
};

export interface MoveOptions extends GitCommandOptions {
  readonly from: string;
  readonly to: string;
  readonly force?: boolean;
}

const buildMoveArgs = (input: MoveOptions): string[] => {
  const args = ["worktree", "move"];
  if (input.force) {
    args.push("--force");
  }
  args.push(input.from, input.to);
  return args;
};

export const move = (
  input: MoveOptions,
): Effect.Effect<Worktree, GitCommandError | GitWorktreeError> => {
  const cwd =
    typeof input.cwd === "string"
      ? input.cwd
      : (input.cwd?.pathname ?? process.cwd());
  const absolute = path.resolve(cwd, input.to);

  return pipe(
    runGit(buildMoveArgs(input), input),
    Effect.zipRight(list(input)),
    Effect.flatMap((worktrees) => findByPath(worktrees, absolute)),
  );
};

export interface RemoveOptions extends GitCommandOptions {
  readonly path: string;
  readonly force?: boolean;
}

const buildRemoveArgs = (input: RemoveOptions): string[] => {
  const args = ["worktree", "remove"];
  if (input.force) {
    args.push("--force");
  }
  args.push(input.path);
  return args;
};

export const remove = (
  input: RemoveOptions,
): Effect.Effect<void, GitCommandError> =>
  pipe(runGit(buildRemoveArgs(input), input), Effect.asVoid);

export interface LockOptions extends GitCommandOptions {
  readonly path: string;
  readonly reason?: string;
}

const buildLockArgs = (input: LockOptions): string[] => {
  const args = ["worktree", "lock", input.path];
  if (input.reason) {
    args.push("--reason", input.reason);
  }
  return args;
};

export const lock = (
  input: LockOptions,
): Effect.Effect<Worktree, GitCommandError | GitWorktreeError> => {
  const cwd =
    typeof input.cwd === "string"
      ? input.cwd
      : (input.cwd?.pathname ?? process.cwd());
  const absolute = path.resolve(cwd, input.path);

  return pipe(
    runGit(buildLockArgs(input), input),
    Effect.zipRight(list(input)),
    Effect.flatMap((worktrees) => findByPath(worktrees, absolute)),
  );
};

export interface UnlockOptions extends GitCommandOptions {
  readonly path: string;
}

export const unlock = (
  input: UnlockOptions,
): Effect.Effect<Worktree, GitCommandError | GitWorktreeError> => {
  const cwd =
    typeof input.cwd === "string"
      ? input.cwd
      : (input.cwd?.pathname ?? process.cwd());
  const absolute = path.resolve(cwd, input.path);

  return pipe(
    runGit(["worktree", "unlock", input.path], input),
    Effect.zipRight(list(input)),
    Effect.flatMap((worktrees) => findByPath(worktrees, absolute)),
  );
};

export interface PruneOptions extends GitCommandOptions {
  readonly dryRun?: boolean;
  readonly verbose?: boolean;
  readonly expire?: string;
}

const buildPruneArgs = (input: PruneOptions): string[] => {
  const args = ["worktree", "prune"];
  if (input.dryRun) {
    args.push("--dry-run");
  }
  if (input.verbose) {
    args.push("--verbose");
  }
  if (input.expire) {
    args.push("--expire", input.expire);
  }
  return args;
};

export const prune = (
  input: PruneOptions = {},
): Effect.Effect<void, GitCommandError> =>
  pipe(runGit(buildPruneArgs(input), input), Effect.asVoid);

export type GitWorktreesError = GitCommandError | GitWorktreeError;
